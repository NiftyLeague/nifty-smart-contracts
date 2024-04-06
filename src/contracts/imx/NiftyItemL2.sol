// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/security/PausableUpgradeable.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/utils/StringsUpgradeable.sol";

import {IMintable} from "@imtbl/imx-contracts/contracts/IMintable.sol";
import {Bytes} from "@imtbl/imx-contracts/contracts/utils/Bytes.sol";
import {Minting} from "@imtbl/imx-contracts/contracts/utils/Minting.sol";

/**
 * @dev {ERC721} token, including:
 */
contract NiftyItemL2 is ERC721EnumerableUpgradeable, OwnableUpgradeable, PausableUpgradeable, IMintable {
    using StringsUpgradeable for uint256;

    /// @dev Token URI
    string public uri;

    /// @dev IMX address
    address public imx;

    /// @dev TokenID -> Item ID
    /// @dev ItemID1 - item 1, ItemID 2 - item 2, ,,,, ItemID 6 - item6, ItemID 7 - key
    mapping(uint256 tokenId => uint256 itemId) public itemIdByTokenId;

    event AssetMinted(address to, uint256 id, bytes blueprint);

    error AccessError(string message);
    error AddressError(string message);
    error MintError(string message);

    modifier onlyOwnerOrIMX() {
        if (msg.sender != imx && msg.sender != owner()) {
            revert AccessError("Must be called by owner or IMX");
        }
        _;
    }

    function initialize(address _imx) external initializer {
        if (_imx == address(0)) revert AddressError("Invalid IMX address");
        __ERC721_init("NiftyItemL2", "NiftyItemL2");
        __Ownable_init();
        __Pausable_init();

        imx = _imx;
    }

    function mintFor(
        address _to,
        uint256 _quantity,
        bytes calldata _mintingBlob
    ) external override onlyOwnerOrIMX whenNotPaused {
        if (_quantity != 1) revert MintError("Amount must be 1");
        (uint256 id, bytes memory blueprint) = Minting.split(_mintingBlob);
        _mint(_to, id, blueprint);

        emit AssetMinted(_to, id, blueprint);
    }

    function burn(uint256 _tokenId) external whenNotPaused {
        _burn(_tokenId);
    }

    function setURI(string calldata _uri) external onlyOwner {
        uri = _uri;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _mint(address _to, uint256 _tokenId, bytes memory blueprint) internal {
        uint256 itemId = Bytes.toUint(blueprint);
        itemIdByTokenId[_tokenId] = itemId;

        _safeMint(_to, _tokenId);
    }

    function _baseURI() internal view virtual override returns (string memory baseUri) {
        return uri;
    }
}
