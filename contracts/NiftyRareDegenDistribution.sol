// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

contract NiftyRareDegenDistribution is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721HolderUpgradeable
{
    /// @dev NiftyDegen NFT address
    IERC721Upgradeable public niftyDegen;

    /// @dev Rare Degen Token Id list
    uint256[] public rareDegenTokenIds;

    /// @dev NiftyLeague Wallet Address
    address public niftyWallet;

    /// @dev Random Hash Value
    bytes32 internal _prevHash;

    event NiftyDegenSet(address indexed niftyDegen);
    event NiftyWalletSet(address indexed niftyWallet);
    event RareDegenClaimed(address indexed user, uint256[] tokenIdsBurned, uint256 rareDegenTokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _niftyDegen, address _niftyWallet) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        require(_niftyDegen != address(0), "Zero address");
        require(_niftyWallet != address(0), "Zero address");

        niftyDegen = IERC721Upgradeable(_niftyDegen);
        niftyWallet = _niftyWallet;
    }

    /**
     * @notice Update the NiftyDegen NFT address
     * @param _niftyDegen NiftyDegen NFT address
     */
    function updateNiftyDegen(address _niftyDegen) external onlyOwner {
        require(_niftyDegen != address(0), "Zero address");

        niftyDegen = IERC721Upgradeable(_niftyDegen);

        emit NiftyDegenSet(_niftyDegen);
    }

    /**
     * @notice Update the NiftyLeague wallet address
     * @param _niftyWallet NiftyLeague wallet address
     */
    function updateNiftyWallet(address _niftyWallet) external onlyOwner {
        require(_niftyWallet != address(0), "Zero address");

        niftyWallet = _niftyWallet;

        emit NiftyWalletSet(_niftyWallet);
    }

    /**
     * @notice Deposit the rare degens
     * @param _rareDegenTokenIdList Token Ids of the rare degens to deposit
     */
    function depositRareDegens(uint256[] calldata _rareDegenTokenIdList) external onlyOwner {
        for (uint256 i = 0; i < _rareDegenTokenIdList.length; ) {
            uint256 tokenId = _rareDegenTokenIdList[i];

            rareDegenTokenIds.push(tokenId);

            unchecked {
                ++i;
            }
        }

        for (uint256 i = 0; i < _rareDegenTokenIdList.length; ) {
            uint256 tokenId = _rareDegenTokenIdList[i];

            niftyDegen.safeTransferFrom(msg.sender, address(this), tokenId, bytes(""));

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Claim the random rare degen
     * @dev The users must transfer 8 normal degens to claim 1 random rare degen
     * @dev NiftyWallet must transfer 12 normal degens to claim 1 random rare degen
     * @dev All the trasnferred the normal degens are burned
     * @param _degenTokenIdList Token Ids of the normal degen to burn
     */
    function claimRandomRareDegen(uint256[] calldata _degenTokenIdList) external nonReentrant whenNotPaused {
        uint256 degenCountToBurn = _degenTokenIdList.length;

        if (msg.sender == niftyWallet) {
            require(degenCountToBurn == 12, "Need 12 degens");
        } else {
            require(degenCountToBurn == 8, "Need 8 degens");
        }

        // get the random rare degen tokenId
        uint256 randomValue = 1;
        for (uint256 i = 0; i < degenCountToBurn; ) {
            unchecked {
                randomValue *= _degenTokenIdList[i]; // generate the random value, ignore overflow
                ++i;
            }
        }

        bytes32 randomHash = keccak256(
            abi.encodePacked(_prevHash, randomValue, msg.sender, block.timestamp, block.difficulty)
        );
        uint256 rareDegenCount = rareDegenTokenIds.length;
        uint256 rareDegenIndex = uint256(randomHash) % rareDegenCount;
        uint256 rareDegenTokenId = rareDegenTokenIds[rareDegenIndex];

        // remove the claimed rare degen Id from the list
        rareDegenTokenIds[rareDegenIndex] = rareDegenTokenIds[rareDegenCount - 1];
        rareDegenTokenIds.pop();

        // set the prevHash
        _prevHash = randomHash;

        // burn user's degens
        for (uint256 i = 0; i < degenCountToBurn; ) {
            niftyDegen.safeTransferFrom(msg.sender, address(1), _degenTokenIdList[i], bytes(""));

            unchecked {
                ++i;
            }
        }

        emit RareDegenClaimed(msg.sender, _degenTokenIdList, rareDegenTokenId);

        // transfer the random rare degen to the user
        niftyDegen.safeTransferFrom(address(this), msg.sender, rareDegenTokenId, bytes(""));
    }

    /**
     * @notice Returns the number of the rare degens in the contract
     * @return rareDegenCount Number of rare degens in the contract
     */
    function getRareDegensCount() external view returns (uint256 rareDegenCount) {
        rareDegenCount = rareDegenTokenIds.length;
    }

    /**
     * @notice Withdraw all rare degens
     * @param _to Address to receive the rare degens
     */
    function withdrawAllRareDegens(address _to) external onlyOwner {
        for (uint256 i = 0; i < rareDegenTokenIds.length; ) {
            uint256 tokenId = rareDegenTokenIds[i];

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
}
