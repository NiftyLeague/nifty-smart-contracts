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
     * @param to Account of the user to mint the tokens to
     * @param amount Amount of tokens to mint to the account
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Destroys `amount` of tokens from `account`, deducting from the caller's allowance.
     * @dev Can only be called by the predicate address
     * @param from Account of the user to burn the tokens from
     * @param amount Amount of tokens to burn from the account
     */
    function burn(address from, uint256 amount) external;

    /**
     * @notice Returns the address of the mapped token on the root chain
     * @return address Returns the address of the root token
     */
    function rootToken() external view returns (address);
}
