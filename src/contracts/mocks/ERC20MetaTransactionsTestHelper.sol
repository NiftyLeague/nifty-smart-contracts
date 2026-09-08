// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC20} from '@openzeppelin/contracts-v4/token/ERC20/ERC20.sol';
import {ERC20Permit} from '@openzeppelin/contracts-v4/token/ERC20/extensions/ERC20Permit.sol';
import {ERC20MetaTransactions} from '../lib/ERC20MetaTransactions.sol';

contract ERC20MetaTransactionsTestHelper is ERC20MetaTransactions {
  constructor() ERC20('Meta Test', 'MTT') ERC20Permit('Meta Test') {
    _mint(msg.sender, 100 ether);
  }
}
