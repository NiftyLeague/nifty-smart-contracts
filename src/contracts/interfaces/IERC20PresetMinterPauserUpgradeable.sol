// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface IERC20PresetMinterPauserUpgradeable is IERC20Upgradeable {
    function burn(uint256 amount) external;
}
