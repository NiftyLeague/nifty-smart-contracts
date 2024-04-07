// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ERC1155PresetMinterPauser} from "@openzeppelin/contracts/v4/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";

contract MockERC1155 is ERC1155PresetMinterPauser {
    constructor() ERC1155PresetMinterPauser("https://api.niftyleague.com/items") {}

    function mint(address to, uint256 id, uint256 amount, bytes memory data) public override {
        _mint(to, id, amount, data);
    }
}
