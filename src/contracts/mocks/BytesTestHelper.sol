// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Bytes} from '../utils/Bytes.sol';

contract BytesTestHelper {
  function fromUint(uint256 value) external pure returns (string memory) {
    return Bytes.fromUint(value);
  }

  function indexOf(
    bytes memory _base,
    string memory _value,
    uint256 _offset
  ) external pure returns (int256) {
    return Bytes.indexOf(_base, _value, _offset);
  }

  function substring(
    bytes memory strBytes,
    uint256 startIndex,
    uint256 endIndex
  ) external pure returns (string memory) {
    return Bytes.substring(strBytes, startIndex, endIndex);
  }

  function toUint(bytes memory b) external pure returns (uint256) {
    return Bytes.toUint(b);
  }
}
