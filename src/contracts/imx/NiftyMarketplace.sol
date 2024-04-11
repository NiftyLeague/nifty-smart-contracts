// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ImmutableERC1155} from "@imtbl/contracts/contracts/token/erc1155/preset/ImmutableERC1155.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NiftyMarketplace - ImmutableERC1155
 * @author @NiftyAndy, Nifty League, Immutable
 */

contract NiftyMarketplace is ImmutableERC1155 {
    /// @dev Name for the token
    string public name;

    /// @dev Symbol for the token
    string public symbol;

    /**
     * @notice Grants `DEFAULT_ADMIN_ROLE` to the supplied `owner` address
     *
     * Sets the name and symbol for the collection
     * Sets the default admin to `owner`
     * Sets the `baseURI`
     * Sets the royalty receiver and amount (this can not be changed once set)
     * @param owner_ The address that will be granted the `DEFAULT_ADMIN_ROLE`
     * @param name_ The name of the collection
     * @param symbol_ The symbol or short-name for the collection
     * @param baseURI_ The base URI for the collection
     * @param contractURI_ The contract URI for the collection
     * @param operatorAllowlist_ The address of the OAL
     * @param receiver_ The address that will receive the royalty payments
     * @param feeNumerator_ The percentage of the sale price that will be paid as a royalty
     */
    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractURI_,
        address operatorAllowlist_,
        address receiver_,
        uint96 feeNumerator_
    ) ImmutableERC1155(owner_, name_, baseURI_, contractURI_, operatorAllowlist_, receiver_, feeNumerator_) {
        name = name_;
        symbol = symbol_;
    }

    /**
     * @notice Returns the URI for a given token ID
     * This overrides the default implementation. See {IERC1155MetadataURI-uri}
     * @param tokenId The identifier of the token
     * @return tokenURI The URI for the given token id
     */
    function uri(uint256 tokenId) public view override returns (string memory tokenURI) {
        return string.concat(baseURI(), Strings.toString(tokenId));
    }
}
