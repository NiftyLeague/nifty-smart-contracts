// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/v4/token/ERC20/IERC20.sol";
import { NiftyLeagueCharacter } from "./NiftyLeagueCharacter.sol";

interface INFTL is IERC20 {
    function burnFrom(address account, uint256 amount) external;
}

/**
 * @title NameableCharacter (Extendable to allow name changes on NFTs)
 * @dev Extends NiftyLeagueCharacter (ERC721)
 */
abstract contract NameableCharacter is NiftyLeagueCharacter {
    /// @notice Cost to change character name in NFTL
    uint256 public constant NAME_CHANGE_PRICE = 1000e18; // 1000 NFTL

    /// @dev Mapping if name string is already used
    mapping(string name => bool isReserved) private _nameReserved;

    event NameUpdated(uint256 indexed tokenId, string previousName, string newName);

    error NameError(string message);

    // External functions

    /**
     * @notice Change name of NFT payable with {NAME_CHANGE_PRICE} NFTL
     * @param tokenId ID of NFT
     * @param newName New name to validate and set on NFT
     * @return name new NFT name
     */
    function changeName(uint256 tokenId, string calldata newName) external returns (string memory name) {
        if (!_exists(tokenId)) revert NameError("nonexistent token");
        if (!_isApprovedOrOwner(_msgSender(), tokenId)) revert NameError("Caller is not owner nor approved");
        string memory prevName = _characters[tokenId].name;
        if (sha256(bytes(newName)) == sha256(bytes(prevName))) revert NameError("New name and old name are equal");
        if (!validateName(newName)) revert NameError("Name is not allowed");
        if (isNameReserved(newName)) revert NameError("Name already reserved");

        INFTL(_NFTL_ADDRESS).burnFrom(_msgSender(), NAME_CHANGE_PRICE);
        if (bytes(_characters[tokenId].name).length > 0) {
            _toggleReserveName(_characters[tokenId].name, false);
        }
        _toggleReserveName(newName, true);
        _characters[tokenId].name = newName;
        emit NameUpdated(tokenId, prevName, newName);
        return newName;
    }

    /**
     * @notice Retrieve name of token
     * @param tokenId ID of NFT
     * @return name of NFT
     */
    function getName(uint256 tokenId) external view returns (string memory name) {
        if (!_exists(tokenId)) revert NameError("nonexistent token");
        return _characters[tokenId].name;
    }

    // Public functions

    /**
     * @notice Check if name is already reserved
     * @param nameString Name to validate
     * @return reserved true if name is reserved
     */
    function isNameReserved(string memory nameString) public view returns (bool reserved) {
        return _nameReserved[_toLower(nameString)];
    }

    /**
     * @notice Check for valid name string (Alphanumeric and spaces without leading or trailing space)
     * @param newName Name to validate
     * @return valid true if name input is valid
     */
    function validateName(string memory newName) public pure returns (bool valid) {
        bytes memory byteName = bytes(newName);
        uint256 length = byteName.length;
        if (length < 1 || length > 32) return false; // name cannot be longer than 32 characters
        if (byteName[0] == 0x20 || byteName[length - 1] == 0x20) return false; // reject leading and trailing space

        bytes1 lastChar = byteName[0];
        for (uint256 i; i < length; ++i) {
            bytes1 currentChar = byteName[i];
            if (currentChar == 0x20 && lastChar == 0x20) return false; // reject double spaces
            if (
                !(currentChar >= 0x30 && currentChar <= 0x39) && //0-9
                !(currentChar >= 0x41 && currentChar <= 0x5A) && //A-Z
                !(currentChar >= 0x61 && currentChar <= 0x7A) && //a-z
                !(currentChar == 0x20) //space
            ) return false;
            lastChar = currentChar;
        }
        return true;
    }

    // Private functions

    /**
     * @notice Reserves the name if isReserve is set to true, de-reserves if set to false
     * @param str NFT name string
     * @param isReserved Bool if name should be reserved or not
     */
    function _toggleReserveName(string memory str, bool isReserved) private {
        _nameReserved[_toLower(str)] = isReserved;
    }

    /**
     * @notice Converts strings to lowercase
     * @param str Any string
     * @return strlow to lower case
     */
    function _toLower(string memory str) private pure returns (string memory strlow) {
        bytes memory bStr = bytes(str);
        uint256 length = bStr.length;
        bytes memory bLower = new bytes(length);
        for (uint256 i = 0; i < length; ++i) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}
