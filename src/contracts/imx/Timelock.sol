// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

contract Timelock is TimelockController, AccessControlEnumerable {
    /**
     * @param minDelay: initial minimum delay for operations
     * @param proposers: accounts to be granted proposer and canceller roles
     * @param executors: accounts to be granted executor role
     * @param admin: optional account to be granted admin role; disable with zero address
     *
     * @notice The optional admin can aid with initial configuration of roles after deployment
     * without being subject to delay, but this role should be subsequently renounced in favor of
     * administration through timelocked proposals.
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(TimelockController, AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc AccessControlEnumerable
     */
    function _grantRole(
        bytes32 role,
        address account
    ) internal virtual override(AccessControl, AccessControlEnumerable) {
        super._grantRole(role, account);
    }

    /**
     * @inheritdoc AccessControlEnumerable
     */
    function _revokeRole(
        bytes32 role,
        address account
    ) internal virtual override(AccessControl, AccessControlEnumerable) {
        super._revokeRole(role, account);
    }
}
