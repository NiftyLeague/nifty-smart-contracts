// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IOperatorAllowlist} from "@imtbl/contracts/contracts/allowlist/IOperatorAllowlist.sol";

contract MockOperatorAllowlist is ERC165, IOperatorAllowlist {
    function isAllowlisted(address) external pure returns (bool) {
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IOperatorAllowlist).interfaceId || super.supportsInterface(interfaceId);
    }
}
