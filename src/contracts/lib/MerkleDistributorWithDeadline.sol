// SPDX-License-Identifier: MIT
// solhint-disable immutable-vars-naming

pragma solidity 0.8.19;

import {MerkleDistributor} from "./MerkleDistributor.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

error EndTimeInPast();
error ClaimWindowFinished();
error NoWithdrawDuringClaim();

contract MerkleDistributorWithDeadline is MerkleDistributor, Ownable {
    using SafeERC20 for IERC20;

    uint256 public immutable endTime;

    constructor(address token_, bytes32 merkleRoot_, uint256 endTime_) MerkleDistributor(token_, merkleRoot_) {
        // slither-disable-next-line timestamp
        if (endTime_ <= block.timestamp) revert EndTimeInPast();
        endTime = endTime_;
    }

    function withdraw() external onlyOwner {
        // slither-disable-next-line timestamp
        if (block.timestamp < endTime) revert NoWithdrawDuringClaim();
        IERC20(token).safeTransfer(msg.sender, IERC20(token).balanceOf(address(this)));
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) public override {
        // slither-disable-next-line timestamp
        if (block.timestamp > endTime) revert ClaimWindowFinished();
        super.claim(index, account, amount, merkleProof);
    }
}
