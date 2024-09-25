// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {INiftyMarketplace} from "../interfaces/INiftyMarketplace.sol";

contract ComicsBurner is ContextUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    /// @dev Nifty Marketplace address
    address public marketplace;

    event ComicsBurned(address indexed by, uint256[] tokenIds, uint256[] values);
    event ItemsMinted(address indexed by, uint256[] tokenIds, uint256[] values);

    error InvalidInput(string message);

    /**
     * @dev Modifier that allows this contract to interact with the Nifty Marketplace using a permit.
     * It calls the Nifty Marketplace contract's `permit` method to approve this contract to spend the caller's NFTs.
     * @param owner The NFT owner granting permission.
     * @param deadline The deadline timestamp for the permit.
     * @param sig The signature for the permit.
     */
    modifier withPermit(address owner, uint256 deadline, bytes memory sig) {
        // owner, spender, approved, deadline, signature
        INiftyMarketplace(marketplace).permit(owner, address(this), true, deadline, sig);
        _;
    }

    function initialize(address marketplace_) public initializer {
        if (marketplace_ == address(0)) revert InvalidInput("Invalid comics address");
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        marketplace = marketplace_;
    }

    /**
     * @notice Burns comic page(s) with prior approval to receive items associated with each page in return.
     * @param comicIds The list of comic IDs to burn.
     * @param comicValues Number of comics to burn, nth value means the number of nth comics(tokenId = n) to burn.
     */
    function burnComics(
        uint256[] calldata comicIds,
        uint256[] calldata comicValues
    ) external nonReentrant whenNotPaused {
        _burnComics(_msgSender(), comicIds, comicValues);
    }

    /**
     * @notice Burns comic page(s) without prior approval to receive items associated with each page in return.
     * @param comicIds The list of comic IDs to burn.
     * @param comicValues Number of comics to burn, nth value means the number of nth comics(tokenId = n) to burn.
     * @param deadline The deadline timestamp for the permit signature.
     * @param sig The permit signature.
     */
    function burnComicsWithPermit(
        uint256[] calldata comicIds,
        uint256[] calldata comicValues,
        uint256 deadline,
        bytes calldata sig
    ) external nonReentrant whenNotPaused withPermit(_msgSender(), deadline, sig) {
        _burnComics(_msgSender(), comicIds, comicValues);
    }

    /**
     * @notice Burns comic page(s) on behalf of owner to provide items associated with each page in return.
     * @param owner The NFT owner burning comics.
     * @param comicIds The list of comic IDs to burn.
     * @param comicValues Number of comics to burn, nth value means the number of nth comics(tokenId = n) to burn.
     * @param deadline The deadline timestamp for the permit signature.
     * @param sig The permit signature.
     */
    function burnComicsForWithPermit(
        address owner,
        uint256[] calldata comicIds,
        uint256[] calldata comicValues,
        uint256 deadline,
        bytes calldata sig
    ) external nonReentrant whenNotPaused withPermit(owner, deadline, sig) {
        _burnComics(owner, comicIds, comicValues);
    }

    /**
     * @notice Pause comics burning
     * @dev Only owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause comics burning
     * @dev Only owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Users can burn all 6 comics at once to receive a Citadel Key.
     * Comic IDs are tokenId #1-6. Matching items are #101-106. Citadel Key is #107.
     * @param account The NFT owner burning comics.
     * @param comicIds The list of comic IDs to burn.
     * @param comicValues Number of comics to burn, nth value means the number of nth comics(tokenId = n) to burn.
     */
    function _burnComics(address account, uint256[] calldata comicIds, uint256[] calldata comicValues) internal {
        if (comicIds.length != comicValues.length) revert InvalidInput("Arrays must have the same length");

        uint256 numberOfKeys = _countKeysToMint(comicValues);

        uint256 length = comicIds.length;
        uint256 maxnm = length + (numberOfKeys > 0 ? 1 : 0);
        uint256[] memory itemIds = new uint256[](maxnm);
        uint256[] memory itemValues = new uint256[](maxnm);
        uint256 itemsToMint = numberOfKeys;

        for (uint256 i; i < length; ++i) {
            if (comicIds[i] > 6) revert InvalidInput("Invalid comic ID");
            itemIds[i] = comicIds[i] + 100;
            uint256 itemCount = comicValues[i] - numberOfKeys;
            itemValues[i] = itemCount;
            itemsToMint += itemCount;
        }

        if (numberOfKeys > 0) {
            itemIds[length] = 107;
            itemValues[length] = numberOfKeys;
        }

        if (itemsToMint == 0) revert InvalidInput("No items to mint");

        INiftyMarketplace(marketplace).burnBatch(account, comicIds, comicValues);
        emit ComicsBurned(account, comicIds, comicValues);

        INiftyMarketplace(marketplace).safeMintBatch(account, itemIds, itemValues, "");
        emit ItemsMinted(account, itemIds, itemValues);
    }

    /**
     * @dev Burning a full-set of comic pages #1-6 mints 1 Citadel Key.
     * This method calculates the minimum value from an array of uint256 values.
     * @param values The array of uint256 values or count of each comic to burn.
     * @return uint256 The minimum value from the array or 0 if comics are missing.
     */
    function _countKeysToMint(uint256[] memory values) internal pure returns (uint256) {
        if (values.length != 6) return 0;

        uint256 length = values.length;
        uint256 minValue = type(uint256).max;
        for (uint256 i; i < length; ++i) {
            if (values[i] < minValue) minValue = values[i];
        }

        return minValue;
    }
}
