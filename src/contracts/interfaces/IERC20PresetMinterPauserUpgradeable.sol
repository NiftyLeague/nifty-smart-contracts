// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20PresetMinterPauserUpgradeable is IERC20Upgradeable {
    function burn(uint256 amount) external;
}
