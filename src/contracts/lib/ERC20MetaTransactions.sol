// SPDX-License-Identifier: MIT
// solhint-disable custom-errors, gas-custom-errors, gas-small-strings, reason-string, no-inline-assembly

pragma solidity 0.8.19;

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20MetaTransactions} from "../interfaces/IERC20MetaTransactions.sol";

abstract contract ERC20MetaTransactions is ERC20Permit, IERC20MetaTransactions {
    /*
     * Meta transaction structure.
     * No point of including value field here as if user is doing value transfer then he has the funds to pay for gas
     * He should call the desired function directly in that case.
     */
    struct MetaTransaction {
        uint256 nonce;
        address from;
        bytes functionSignature;
    }

    /// @dev EIP712 typehash for the contract's domain
    bytes32 private constant _META_TRANSACTION_TYPEHASH =
        keccak256(bytes("MetaTransaction(uint256 nonce,address from,bytes functionSignature)"));

    /// @dev A mapping of users nonces to prevent replay attacks
    mapping(address user => uint256 nonce) private _nonces;

    /**
     * @inheritdoc IERC20MetaTransactions
     */
    function executeMetaTransaction(
        address userAddress,
        bytes calldata functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (bytes memory) {
        bytes4 destinationFunctionSig = _convertBytesToBytes4(functionSignature);

        require(destinationFunctionSig != msg.sig, "functionSignature can not be of executeMetaTransaction method");

        MetaTransaction memory metaTx = MetaTransaction({
            nonce: _nonces[userAddress],
            from: userAddress,
            functionSignature: functionSignature
        });

        require(_verify(userAddress, metaTx, sigR, sigS, sigV), "Signer and signature do not match");

        unchecked {
            ++_nonces[userAddress];
        }
        // Append userAddress at the end to extract it from calling context
        // slither-disable-next-line low-level-calls
        (bool success, bytes memory returnData) = address(this).call(abi.encodePacked(functionSignature, userAddress)); // solhint-disable avoid-low-level-calls

        require(success, "Function call not successful");
        // slither-disable-next-line reentrancy-events
        emit MetaTransactionExecuted(userAddress, msg.sender, functionSignature);
        return returnData;
    }

    /**
     * @inheritdoc IERC20MetaTransactions
     */
    function invalidateNext(uint256 offset) external {
        _nonces[msg.sender] += offset;
    }

    /**
     * @inheritdoc IERC20MetaTransactions
     */
    function getNonce(address user) external view returns (uint256 nonce) {
        nonce = _nonces[user];
    }

    /**
     * @dev Returns the address of the message sender to enable meta transactions execution on behalf of the user.
     * Overrides the internal _msgSender() function from ERC20 Context with ERC20MetaTransactions.
     * @return sender address of the message sender.
     */
    function _msgSender() internal view virtual override returns (address sender) {
        if (msg.sender == address(this)) {
            bytes memory array = msg.data;
            uint256 calldataLength = msg.data.length;
            // slither-disable-next-line assembly
            assembly {
                // Load the 32 bytes word from memory with the address on the lower 20 bytes, and mask those.
                sender := and(mload(add(array, calldataLength)), 0xffffffffffffffffffffffffffffffffffffffff)
            }
        } else {
            sender = msg.sender;
        }
        return sender;
    }

    /**
     * @notice Verifies the signature of a meta transaction.
     * @param user The address of the user.
     * @param metaTx The meta transaction struct.
     * @param sigR Part of the signature data.
     * @param sigS Part of the signature data.
     * @param sigV Recovery byte of the signature.
     * @return valid if the signature is valid, false otherwise.
     */
    function _verify(
        address user,
        MetaTransaction memory metaTx,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) private view returns (bool valid) {
        // The inclusion of a user specific nonce removes signature malleability concerns
        address signer = ecrecover(_hashTypedDataV4(_hashMetaTransaction(metaTx)), sigV, sigR, sigS);
        require(signer != address(0), "Invalid signature");
        return signer == user;
    }

    /**
     * @dev Calculates the hash of a meta transaction.
     * @param metaTx The meta transaction object containing the necessary data.
     * @return bytes32 hash of the meta transaction.
     */
    function _hashMetaTransaction(MetaTransaction memory metaTx) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(_META_TRANSACTION_TYPEHASH, metaTx.nonce, metaTx.from, keccak256(metaTx.functionSignature))
            );
    }

    /**
     * @dev Extract the first four bytes from `inBytes`
     * @param inBytes The bytes from which the first four bytes will be extracted
     * @return outBytes4 The first four bytes of `inBytes`
     */
    function _convertBytesToBytes4(bytes memory inBytes) private pure returns (bytes4 outBytes4) {
        if (inBytes.length == 0) {
            return 0x0;
        }
        // slither-disable-next-line assembly
        assembly {
            // extract the first 4 bytes from inBytes
            outBytes4 := mload(add(inBytes, 32))
        }
    }
}
