// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IGovToken} from "../interfaces/IGovToken.sol";
import {INiftyMarketplace} from "../interfaces/INiftyMarketplace.sol";

contract Store is ContextUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @dev Nifty Marketplace address
    address public marketplace;

    /// @dev NFTL Token address
    address public nftl;

    /// @dev NFTL Treasury address
    address public treasury;

    /// @dev ItemId -> Price (NFTL)
    mapping(uint256 itemId => uint256 price) public listingPrice;

    /// @dev ItemId -> Max Supply
    mapping(uint256 itemId => uint256 maxSupply) public maxSupply;

    /// @dev ItemId -> Paused
    mapping(uint256 itemId => bool paused) public isAvailable;

    event NftlSpent(address indexed by, uint256 amount);
    event ItemsMinted(address indexed by, uint256[] tokenIds, uint256[] values);

    error InvalidInput(string message);

    /**
     * @dev Modifier that allows this contract to spend users NFTL using a permit.
     * It calls the NFTL contract's `permit` method to approve this contract to spend the caller's tokens.
     * @param owner The NFTL holder granting spend approval.
     * @param value The amount of NFTL to approve.
     * @param deadline The deadline timestamp for the permit.
     * @param sig The signature for the permit.
     */
    modifier withPermit(address owner, uint256 value, uint256 deadline, Signature calldata sig) {
        IGovToken(nftl).permit(owner, address(this), value, deadline, sig.v, sig.r, sig.s);
        _;
    }

    function initialize(address marketplace_, address nftl_, address treasury_) public initializer {
        if (marketplace_ == address(0)) revert InvalidInput("Invalid comics address");
        if (nftl_ == address(0)) revert InvalidInput("Invalid NFTL address");
        if (treasury_ == address(0)) revert InvalidInput("Invalid Treasury address");
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        marketplace = marketplace_;
        nftl = nftl_;
        treasury = treasury_;
    }

    /**
     * @notice Purchase item(s) for NFTL provided prior NFTL spend approval.
     * @param itemIds The list of item IDs to purchase.
     * @param itemValues Number of items to purchase.
     */
    function purchaseItems(
        uint256[] calldata itemIds,
        uint256[] calldata itemValues
    ) external nonReentrant whenNotPaused {
        _purchaseItems(_msgSender(), itemIds, itemValues);
    }

    /**
     * @notice Purchase item(s) for NFTL without prior NFTL spend approval using permit.
     * @param itemIds The list of item IDs to purchase.
     * @param itemValues Number of items to purchase.
     * @param deadline The deadline timestamp for the permit signature.
     * @param sig The signature for the permit.
     */
    function purchaseItemsWithPermit(
        uint256[] calldata itemIds,
        uint256[] calldata itemValues,
        uint256 value,
        uint256 deadline,
        Signature calldata sig
    ) external nonReentrant whenNotPaused withPermit(_msgSender(), value, deadline, sig) {
        _purchaseItems(_msgSender(), itemIds, itemValues);
    }

    /**
     * @notice Purchase item(s) on behalf of NFTL holder using permit.
     * @param holder The NFTL holder granting spend approval.
     * @param itemIds The list of item IDs to purchase.
     * @param itemValues Number of items to purchase.
     * @param deadline The deadline timestamp for the permit signature.
     * @param sig The signature for the permit.
     */
    function purchaseItemsForWithPermit(
        address holder,
        uint256[] calldata itemIds,
        uint256[] calldata itemValues,
        uint256 value,
        uint256 deadline,
        Signature calldata sig
    ) external nonReentrant whenNotPaused withPermit(holder, value, deadline, sig) {
        _purchaseItems(holder, itemIds, itemValues);
    }

    /**
     * @dev Sets the availability for multiple items.
     * @param itemIds An array of item IDs.
     * @param availability An array of corresponding booleans for each item's availability.
     * @notice Only the contract owner can call this function.
     * @notice The length of `itemIds` and `availability` arrays must be the same.
     */
    function setItemsAvailability(uint256[] calldata itemIds, bool[] calldata availability) external onlyOwner {
        uint256 itemCount = itemIds.length;
        if (itemCount != availability.length) revert InvalidInput("Arrays must have the same length");

        for (uint256 i; i < itemCount; ++i) {
            isAvailable[itemIds[i]] = availability[i];
        }
    }

    /**
     * @dev Sets the prices for multiple items.
     * @param itemIds An array of item IDs.
     * @param prices An array of corresponding prices for the items.
     * @notice Only the contract owner can call this function.
     * @notice The length of `itemIds` and `prices` arrays must be the same.
     */
    function setItemsPrice(uint256[] calldata itemIds, uint256[] calldata prices) external onlyOwner {
        uint256 itemCount = itemIds.length;
        if (itemCount != prices.length) revert InvalidInput("Arrays must have the same length");

        for (uint256 i; i < itemCount; ++i) {
            listingPrice[itemIds[i]] = prices[i];
        }
    }

    /**
     * @dev Sets the max supply for multiple items.
     * @param itemIds An array of item IDs.
     * @param supply An array of corresponding prices for the items.
     * @notice Only the contract owner can call this function.
     * @notice The length of `itemIds` and `supply` arrays must be the same.
     */
    function setItemsMaxSupply(uint256[] calldata itemIds, uint256[] calldata supply) external onlyOwner {
        uint256 itemCount = itemIds.length;
        if (itemCount != supply.length) revert InvalidInput("Arrays must have the same length");

        for (uint256 i; i < itemCount; ++i) {
            maxSupply[itemIds[i]] = supply[i];
        }
    }

    /**
     * @dev Sets the max supply for multiple items.
     * @param itemIds An array of item IDs.
     * @param prices An array of corresponding prices for the items.
     * @param supply An array of corresponding prices for the items.
     * @notice Only the contract owner can call this function.
     * @notice The length of `itemIds` and `supply` arrays must be the same.
     */
    function listNewItems(
        uint256[] calldata itemIds,
        uint256[] calldata prices,
        uint256[] calldata supply
    ) external onlyOwner {
        uint256 itemCount = itemIds.length;
        if (itemCount != prices.length || itemCount != supply.length)
            revert InvalidInput("Arrays must have the same length");

        for (uint256 i; i < itemCount; ++i) {
            listingPrice[itemIds[i]] = prices[i];
            maxSupply[itemIds[i]] = supply[i];
            isAvailable[itemIds[i]] = true;
        }
    }

    /**
     * @notice Pause comics burning.
     * @dev Only owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause comics burning.
     * @dev Only owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Updates treasury address.
     * @param treasury_ The new treasury address.
     * @dev Only owner.
     */
    function updateTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidInput("Invalid Treasury address");
        treasury = treasury_;
    }

    /**
     * @dev Splits a signature into its components (v, r, s).
     * @param sig The bytes signature to split.
     * @return Signature The signature struct with split components.
     */
    function splitSignature(bytes calldata sig) external pure returns (Signature memory) {
        return
            Signature({
                r: bytes32(sig[0:32]), // Copy first 32 bytes
                s: bytes32(sig[32:64]), // Copy 32 more bytes
                v: uint8(bytes1(sig[64:65])) // Copy last byte
            });
    }

    /**
     * @dev Checks NFTL contract approval and spends user's tokens for items purchased.
     * @param account The NFTL holder granting spend approval.
     * @param itemIds The list of item IDs to purchase.
     * @param itemValues Number of items to purchase.
     */
    function _purchaseItems(address account, uint256[] calldata itemIds, uint256[] calldata itemValues) internal {
        if (itemIds.length != itemValues.length) revert InvalidInput("Arrays must have the same length");

        uint256 nftlRequired = 0;
        uint256 length = itemIds.length;
        uint256 itemsToMint = 0;
        for (uint256 i; i < length; ++i) {
            if (!isAvailable[itemIds[i]]) revert InvalidInput("Item not available");
            uint256 newSupply = itemValues[i];
            uint256 totalSupply = INiftyMarketplace(marketplace).totalSupply((itemIds[i])) + newSupply;
            if (maxSupply[itemIds[i]] < totalSupply) revert InvalidInput("Item supply exceeded");
            if (maxSupply[itemIds[i]] == totalSupply) isAvailable[itemIds[i]] = false;
            nftlRequired += _checkItemPrice(itemIds[i]) * newSupply;
            itemsToMint += newSupply;
        }

        if (itemsToMint == 0) revert InvalidInput("No items to mint");

        bool success = IGovToken(nftl).transferFrom(account, treasury, nftlRequired);
        if (!success) revert InvalidInput("NFTL transfer failed");
        emit NftlSpent(account, nftlRequired);

        INiftyMarketplace(marketplace).safeMintBatch(account, itemIds, itemValues, "");
        emit ItemsMinted(account, itemIds, itemValues);
    }

    /**
     * @param itemId The item to price check.
     * @return uint256 price validated price of the item.
     */
    function _checkItemPrice(uint256 itemId) internal view returns (uint256) {
        uint256 price = listingPrice[itemId];
        if (price == 0) revert InvalidInput("Item price not found");

        return price;
    }
}
