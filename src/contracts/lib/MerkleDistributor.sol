// SPDX-License-Identifier: MIT
// solhint-disable immutable-vars-naming, named-parameters-mapping

pragma solidity 0.8.19;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IMerkleDistributor} from "../interfaces/IMerkleDistributor.sol";

error AlreadyClaimed();
error InvalidProof();

contract MerkleDistributor is IMerkleDistributor {
    using SafeERC20 for IERC20;

    address public immutable override token;
    bytes32 public immutable override merkleRoot;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private _claimedBitMap;

    constructor(address token_, bytes32 merkleRoot_) {
        // slither-disable-next-line missing-zero-check
        token = token_;
        merkleRoot = merkleRoot_;
    }

    function claim(
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) public virtual override {
        if (isClaimed(index)) revert AlreadyClaimed();

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        // Mark it claimed and send the token.
        _setClaimed(index);
        // slither-disable-next-line reentrancy-events
        IERC20(token).safeTransfer(account, amount);

        emit Claimed(index, account, amount);
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = _claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        _claimedBitMap[claimedWordIndex] = _claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }
}
