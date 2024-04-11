// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/**
 * @dev Interface of ERC20MetaTransactions extending EIP712 for meta transactions.
 */
interface IERC20MetaTransactions {
    /**
     * @dev Emitted when a meta transaction is successfully executed.
     */
    event MetaTransactionExecuted(address userAddress, address relayerAddress, bytes functionSignature);

    /**
     * @notice Executes a meta transaction on behalf of the user.
     * @dev This function allows a user to sign a transaction off-chain and have it executed by another entity.
     * Emits an {MetaTransactionExecuted} event on success indicating the transaction was executed.
     * @param userAddress The address of the user initiating the transaction.
     * @param functionSignature The signature of the function to be executed.
     * @param sigR Part of the signature data.
     * @param sigS Part of the signature data.
     * @param sigV Recovery byte of the signature.
     * @return returnData The bytes returned from the executed function.
     */
    function executeMetaTransaction(
        address userAddress,
        bytes calldata functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (bytes memory);

    /**
     * @notice Invalidates next "offset" number of nonces for the calling address
     * @param offset The number of nonces, from the current nonce, to invalidate.
     */
    function invalidateNext(uint256 offset) external;

    /**
     * @notice Retrieves the current nonce for a user.
     * @param user The address of the user.
     * @return nonce The current nonce of the user.
     */
    function getNonce(address user) external view returns (uint256 nonce);
}
