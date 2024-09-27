// SPDX-License-Identifier: MIT
// solhint-disable immutable-vars-naming

pragma solidity 0.8.19;

import {MerkleDistributorWithDeadline} from "../lib/MerkleDistributorWithDeadline.sol";

contract BalanceManagerDistributor is MerkleDistributorWithDeadline {
    constructor(
        address token_,
        bytes32 merkleRoot_,
        uint256 endTime_
    ) MerkleDistributorWithDeadline(token_, merkleRoot_, endTime_) {}
}
