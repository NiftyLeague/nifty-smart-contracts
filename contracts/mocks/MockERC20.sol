// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockERC20 is ERC20 {
  constructor() ERC20("MockToken", "TESTTOKEN") {}

  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }
}
