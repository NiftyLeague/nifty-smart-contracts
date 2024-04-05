// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import { IERC1155Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

interface IERC1155SupplyUpgradeable is IERC1155Upgradeable {
    function totalSupply(uint256 id) external view returns (uint256 res);
}
