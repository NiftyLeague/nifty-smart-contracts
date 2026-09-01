// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Minting} from '../utils/Minting.sol';

contract MintingTestHelper {
  function split(bytes calldata blob) external pure returns (uint256 tokenId, bytes memory blueprint) {
    return Minting.split(blob);
  }
}
