// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC20} from '@openzeppelin/contracts-v4/token/ERC20/ERC20.sol';
import {ERC20Permit} from '@openzeppelin/contracts-v4/token/ERC20/extensions/ERC20Permit.sol';
import {ERC20Votes} from '@openzeppelin/contracts-v4/token/ERC20/extensions/ERC20Votes.sol';

contract MockERC20Votes is ERC20, ERC20Permit, ERC20Votes {
  constructor(string memory name_, string memory symbol_)
    ERC20(name_, symbol_)
    ERC20Permit(name_)
  {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override(ERC20, ERC20Votes) {
    super._afterTokenTransfer(from, to, amount);
  }

  function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
    super._mint(to, amount);
  }

  function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
    super._burn(account, amount);
  }
}
