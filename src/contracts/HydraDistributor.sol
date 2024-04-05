// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { IERC721Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import { ERC721HolderUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

/**
 * @title HydraDistributor
 * @notice Hydra is the 7th tribe of NiftyDegen.
 */
contract HydraDistributor is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721HolderUpgradeable
{
    /// @dev NiftyDegen NFT address
    IERC721Upgradeable public niftyDegen;

    /// @dev Hydra Token Id list
    uint256[] public hydraTokenIds;

    /// @dev NiftyLeague Wallet Address
    address public niftyWallet;

    /// @dev Random Hash Value
    bytes32 internal _prevHash;

    event NiftyDegenSet(address indexed niftyDegen);
    event NiftyWalletSet(address indexed niftyWallet);
    event HydraClaimed(address indexed user, uint256[] tokenIdsBurned, uint256 hydraTokenId);

    error AddressError(string message);
    error BurnCountError(uint256 count, string message);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _niftyDegen, address _niftyWallet) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        if (_niftyDegen == address(0) || _niftyWallet == address(0)) {
            revert AddressError("Zero address");
        }

        niftyDegen = IERC721Upgradeable(_niftyDegen);
        niftyWallet = _niftyWallet;
    }

    /**
     * @notice Update the NiftyDegen NFT address
     * @param _niftyDegen NiftyDegen NFT address
     */
    function updateNiftyDegen(address _niftyDegen) external onlyOwner {
        if (_niftyDegen == address(0)) revert AddressError("Zero address");

        niftyDegen = IERC721Upgradeable(_niftyDegen);

        emit NiftyDegenSet(_niftyDegen);
    }

    /**
     * @notice Update the NiftyLeague wallet address
     * @param _niftyWallet NiftyLeague wallet address
     */
    function updateNiftyWallet(address _niftyWallet) external onlyOwner {
        if (_niftyWallet == address(0)) revert AddressError("Zero address");

        niftyWallet = _niftyWallet;

        emit NiftyWalletSet(_niftyWallet);
    }

    /**
     * @notice Deposit the Hydra
     * @param _hydraTokenIdList Token Ids of the Hydra to deposit
     */
    function depositHydra(uint256[] calldata _hydraTokenIdList) external onlyOwner {
        uint256 length = _hydraTokenIdList.length;
        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = _hydraTokenIdList[i];

            hydraTokenIds.push(tokenId);

            unchecked {
                ++i;
            }
        }

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = _hydraTokenIdList[i];

            niftyDegen.safeTransferFrom(msg.sender, address(this), tokenId, bytes(""));

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Claim the random Hydra
     * @dev The users must transfer 8 normal degens to claim 1 random Hydra
     * @dev NiftyWallet must transfer 12 normal degens to claim 1 random Hydra
     * @dev All the trasnferred the normal degens are burned
     * @param _degenTokenIdList Token Ids of the normal degens to burn
     */
    function claimRandomHydra(uint256[] calldata _degenTokenIdList) external nonReentrant whenNotPaused {
        uint256 degenCountToBurn = _degenTokenIdList.length;

        if (msg.sender == niftyWallet && degenCountToBurn != 12) {
            revert BurnCountError(degenCountToBurn, "Need 12 degens");
        } else if (msg.sender != niftyWallet && degenCountToBurn != 8) {
            revert BurnCountError(degenCountToBurn, "Need 8 degens");
        }

        // get the random Hydra tokenId
        uint256 randomValue = 1;
        for (uint256 i = 0; i < degenCountToBurn; ) {
            unchecked {
                randomValue *= _degenTokenIdList[i]; // generate the random value, ignore overflow
                ++i;
            }
        }

        bytes32 randomHash = keccak256(
            abi.encodePacked(_prevHash, randomValue, msg.sender, block.timestamp, block.basefee)
        );
        uint256 hydraCount = hydraTokenIds.length;
        uint256 hydraIndex = uint256(randomHash) % hydraCount;
        uint256 hydraTokenId = hydraTokenIds[hydraIndex];

        // remove the claimed rare degen Id from the list
        hydraTokenIds[hydraIndex] = hydraTokenIds[hydraCount - 1];
        hydraTokenIds.pop();

        // set the prevHash
        _prevHash = randomHash;

        // burn user's degens
        for (uint256 i = 0; i < degenCountToBurn; ) {
            niftyDegen.safeTransferFrom(msg.sender, address(1), _degenTokenIdList[i], bytes(""));

            unchecked {
                ++i;
            }
        }

        emit HydraClaimed(msg.sender, _degenTokenIdList, hydraTokenId);

        // transfer the random Hydra to the user
        niftyDegen.safeTransferFrom(address(this), msg.sender, hydraTokenId, bytes(""));
    }

    /**
     * @notice Withdraw all Hydra
     * @param _to Address to receive the Hydra
     */
    function withdrawAllHydra(address _to) external onlyOwner {
        uint256 length = hydraTokenIds.length;
        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = hydraTokenIds[i];

            niftyDegen.safeTransferFrom(address(this), _to, tokenId, bytes(""));

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Returns the number of the Hydra in the contract
     * @return hydraCount Number of Hydra in the contract
     */
    function getHydraCount() external view returns (uint256 hydraCount) {
        hydraCount = hydraTokenIds.length;
    }

    function getHydraTokenIds() external view returns (uint256[] memory tokenIds) {
        return hydraTokenIds;
    }
}
