// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IERC5805} from "@openzeppelin/contracts/interfaces/IERC5805.sol";

import {IChildERC20} from "./IChildERC20.sol";

/**
 * @dev Interface of NFTL Token
 */
// solhint-disable-next-line no-empty-blocks
interface IGovToken is IChildERC20, IERC20Permit, IERC5805 {}
