// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";

contract NFTLTimelock is TokenTimelock {
    constructor(
        address nftlAddress,
        address beneficiary_,
        uint256 releaseTime_
    ) TokenTimelock(IERC20(nftlAddress), beneficiary_, releaseTime_) {}
}
