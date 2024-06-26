// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TokenTimelock} from "@openzeppelin/contracts/token/ERC20/utils/TokenTimelock.sol";

contract NFTLTimelock is TokenTimelock {
    constructor(
        address nftlAddress,
        address beneficiary_,
        uint256 releaseTime_
    ) TokenTimelock(IERC20(nftlAddress), beneficiary_, releaseTime_) {}
}
