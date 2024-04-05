// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20PresetMinterPauser} from "@openzeppelin/contracts/v4/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract MockERC20 is ERC20PresetMinterPauser {
    constructor() ERC20PresetMinterPauser("MockToken", "TESTTOKEN") {}

    function mint(address to, uint256 amount) public override {
        _mint(to, amount);
    }
}
