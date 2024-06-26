// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache 2.0

pragma solidity 0.8.19;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @dev Interface of IChildERC20
 */
interface IChildERC20 is IERC20Metadata {
    /**
     * @notice Mints an amount of tokens to a particular address
     * @dev Can only be called by the predicate address
     * @param account Account of the user to mint the tokens to
     * @param amount Amount of tokens to mint to the account
     * @return bool Returns true if function call is succesful
     */
    function mint(address account, uint256 amount) external returns (bool);

    /**
     * @notice Burns an amount of tokens from a particular address
     * @dev Can only be called by the predicate address
     * @param account Account of the user to burn the tokens from
     * @param amount Amount of tokens to burn from the account
     * @return bool Returns true if function call is succesful
     */
    function burn(address account, uint256 amount) external returns (bool);

    /**
     * @notice Returns bridge address controlling the child token
     * @return address Returns the address of the Bridge
     */
    function bridge() external view returns (address);

    /**
     * @notice Returns the address of the mapped token on the root chain
     * @return address Returns the address of the root token
     */
    function rootToken() external view returns (address);
}
