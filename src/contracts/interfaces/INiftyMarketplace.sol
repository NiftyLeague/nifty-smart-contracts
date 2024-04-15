// SPDX-License-Identifier: MIT
// solhint-disable ordering

pragma solidity 0.8.19;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC5267} from "@openzeppelin/contracts/interfaces/IERC5267.sol";
import {IAccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import {IERC1155Permit} from "@imtbl/contracts/contracts/token/erc1155/abstract/IERC1155Permit.sol";
import {IImmutableERC1155Errors} from "@imtbl/contracts/contracts/errors/Errors.sol";

/**
 * @title INiftyMarketplace
 * @dev Interface for the Nifty Marketplace contract.
 */
interface INiftyMarketplace is
    IERC1155,
    IERC1155Permit,
    IImmutableERC1155Errors,
    IAccessControlEnumerable,
    IERC2981,
    IERC5267
{
    /**
     * @dev Returns the base URI for all token URIs.
     */
    function baseURI() external view returns (string memory);

    /**
     * @dev Burns a specific amount of tokens from the specified account.
     * @param account The address of the token owner.
     * @param id The ID of the token to be burned.
     * @param value The amount of tokens to be burned.
     */
    function burn(address account, uint256 id, uint256 value) external;

    /**
     * @dev Burns multiple tokens from the specified account.
     * @param account The address of the token owner.
     * @param ids The IDs of the tokens to be burned.
     * @param values The amounts of tokens to be burned.
     */
    function burnBatch(address account, uint256[] memory ids, uint256[] memory values) external;

    /**
     * @dev Checks if a token with the given ID exists.
     * @param id The ID of the token to check.
     * @return True if the token exists, false otherwise.
     */
    function exists(uint256 id) external view returns (bool);

    /**
     * @dev Returns an array of addresses that have the admin role.
     * @return An array of addresses with the admin role.
     */
    function getAdmins() external view returns (address[] memory);

    /**
     * @dev Grants the minter role to the specified user.
     * @param user The address of the user to grant the minter role to.
     */
    function grantMinterRole(address user) external;

    /**
     * @dev Returns the name of the token.
     * @return The name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Revokes the minter role from the specified user.
     * @param user The address of the user to revoke the minter role from.
     */
    function revokeMinterRole(address user) external;

    /**
     * @dev Safely mints a new token to the specified address.
     * @param to The address to mint the token to.
     * @param id The ID of the token to mint.
     * @param value The amount of tokens to mint.
     * @param data Additional data to pass to the recipient.
     */
    function safeMint(address to, uint256 id, uint256 value, bytes memory data) external;

    /**
     * @dev Safely mints multiple tokens to the specified address.
     * @param to The address to mint the tokens to.
     * @param ids The IDs of the tokens to mint.
     * @param values The amounts of tokens to mint.
     * @param data Additional data to pass to the recipient.
     */
    function safeMintBatch(address to, uint256[] calldata ids, uint256[] calldata values, bytes memory data) external;

    /**
     * @dev Sets the base URI for all token URIs.
     * @param baseURI_ The new base URI.
     */
    function setBaseURI(string memory baseURI_) external;

    /**
     * @dev Sets the contract URI.
     * @param contractURI_ The new contract URI.
     */
    function setContractURI(string memory contractURI_) external;

    /**
     * @dev Sets the default royalty receiver and fee for all tokens.
     * @param receiver The address of the default royalty receiver.
     * @param feeNumerator The fee numerator for the default royalty.
     */
    function setDefaultRoyaltyReceiver(address receiver, uint96 feeNumerator) external;

    /**
     * @dev Sets the royalty receiver and fee for a specific token.
     * @param tokenId The ID of the token to set the royalty for.
     * @param receiver The address of the royalty receiver.
     * @param feeNumerator The fee numerator for the royalty.
     */
    function setNFTRoyaltyReceiver(uint256 tokenId, address receiver, uint96 feeNumerator) external;

    /**
     * @dev Sets the royalty receiver and fee for multiple tokens.
     * @param tokenIds The IDs of the tokens to set the royalty for.
     * @param receiver The address of the royalty receiver.
     * @param feeNumerator The fee numerator for the royalty.
     */
    function setNFTRoyaltyReceiverBatch(uint256[] calldata tokenIds, address receiver, uint96 feeNumerator) external;

    /**
     * @dev Returns the symbol of the token.
     * @return The symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the total supply of a specific token.
     * @param id The ID of the token to get the total supply of.
     * @return The total supply of the token.
     */
    function totalSupply(uint256 id) external view returns (uint256);

    /**
     * @dev Returns the URI for a specific token.
     * @param tokenId The ID of the token to get the URI for.
     * @return The URI of the token.
     */
    function uri(uint256 tokenId) external view returns (string memory);
}
