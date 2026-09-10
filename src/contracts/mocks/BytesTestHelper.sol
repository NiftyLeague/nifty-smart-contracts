// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Bytes} from '../utils/Bytes.sol';

contract BytesTestHelper {
  function fromUint(uint256 value) external pure returns (string memory) {
    return Bytes.fromUint(value);
  }

  function indexOf(
    bytes calldata _base,
    string calldata _value,
    uint256 _offset
  ) external pure returns (int256) {
    return Bytes.indexOf(_base, _value, _offset);
  }

  function substring(
    bytes calldata strBytes,
    uint256 startIndex,
    uint256 endIndex
  ) external pure returns (string memory) {
    return Bytes.substring(strBytes, startIndex, endIndex);
  }

  function toUint(bytes calldata b) external pure returns (uint256) {
    return Bytes.toUint(b);
  }
}
