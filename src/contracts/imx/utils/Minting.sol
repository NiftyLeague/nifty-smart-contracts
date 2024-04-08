// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Bytes} from "./Bytes.sol";

library Minting {
    // Split the minting blob into token_id and blueprint portions
    // {token_id}:{blueprint}

    error SeparatorMustExist();

    function split(bytes calldata blob) internal pure returns (uint256 _tokenID, bytes memory _blueprint) {
        int256 index = Bytes.indexOf(blob, ":", 0);
        if (index < 0) revert SeparatorMustExist();
        // Trim the { and } from the parameters
        uint256 tokenID = Bytes.toUint(blob[1:uint256(index) - 1]);
        uint256 blueprintLength = blob.length - uint256(index) - 3;
        if (blueprintLength == 0) {
            return (tokenID, bytes(""));
        }
        bytes calldata blueprint = blob[uint256(index) + 2:blob.length - 1];
        return (tokenID, blueprint);
    }
}
