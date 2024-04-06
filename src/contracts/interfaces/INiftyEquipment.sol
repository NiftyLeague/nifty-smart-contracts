// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

interface INiftyEquipment {
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external;

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external;
}
