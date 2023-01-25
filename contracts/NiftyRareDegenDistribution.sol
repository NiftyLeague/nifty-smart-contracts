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
    uint256[] internal _rareDegenTokenIds;

    /// @dev Rare Degen Token Id -> Bool
    mapping(uint256 => bool) internal _isRareDegenClaimed;

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

        niftyDegen = IERC721Upgradeable(_niftyDegen);
        niftyWallet = _niftyWallet;
    }

    function updateNiftyDegen(address _niftyDegen) external onlyOwner {
        niftyDegen = IERC721Upgradeable(_niftyDegen);

        emit NiftyDegenSet(_niftyDegen);
    }

    function updateNiftyWallet(address _niftyWallet) external onlyOwner {
        niftyWallet = _niftyWallet;

        emit NiftyWalletSet(_niftyWallet);
    }

    function depositRareDegens(uint256[] calldata _rareDegenTokenIdList) external onlyOwner {
        for (uint256 i; i < _rareDegenTokenIdList.length; ) {
            uint256 tokenId = _rareDegenTokenIdList[i];
            niftyDegen.safeTransferFrom(msg.sender, address(this), tokenId, bytes(""));

            unchecked {
                ++i;
            }
        }
    }

    function claimRandomRareDegen(uint256[] calldata _degenTokenIdList) external nonReentrant whenNotPaused {
        uint256 degenCountToBurn = _degenTokenIdList.length;

        if (msg.sender == niftyWallet) {
            require(degenCountToBurn == 12, "Need 12 degens");
        } else {
            require(degenCountToBurn == 8, "Need 8 degens");
        }

        // burn user's degens
        uint256 randomValue = 1;
        for (uint256 i; i < degenCountToBurn; ) {
            niftyDegen.safeTransferFrom(msg.sender, address(0), _degenTokenIdList[i], bytes(""));

            unchecked {
                randomValue *= _degenTokenIdList[i]; // generate the random value, ignore overflow
                ++i;
            }
        }

        uint256 rareDegenCount = _rareDegenTokenIds.length;
        bytes32 randomHash = keccak256(
            abi.encodePacked(_prevHash, randomValue, msg.sender, block.timestamp, block.difficulty)
        );
        uint256 rareDegenIndex = uint256(randomHash) % rareDegenCount;
        uint256 rareDegenTokenId = _rareDegenTokenIds[rareDegenIndex];

        // transfer the random rare degen to the user
        niftyDegen.safeTransferFrom(address(this), msg.sender, rareDegenTokenId, bytes(""));

        // remove the claimed rare degen Id from the list
        _rareDegenTokenIds[rareDegenIndex] = _rareDegenTokenIds[rareDegenCount - 1];
        _rareDegenTokenIds.pop();

        // set the prevHash
        _prevHash = randomHash;

        emit RareDegenClaimed(msg.sender, _degenTokenIdList, rareDegenTokenId);
    }

    function withdrawAllRareDegens(address _to) external onlyOwner {
        for (uint256 i; i < _rareDegenTokenIds.length; ) {
            uint256 tokenId = _rareDegenTokenIds[i];

            niftyDegen.safeTransferFrom(address(this), _to, tokenId, bytes(""));

            unchecked {
                ++i;
            }
        }
    }
}
