// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IERC20MetaTransactions {
    function executeMetaTransaction(
        address userAddress,
        bytes calldata functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (bytes memory);

    function invalidateNext(uint256 offset) external;

    function getNonce(address user) external view returns (uint256 nonce);
}
