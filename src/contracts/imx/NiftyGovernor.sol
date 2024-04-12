// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract NiftyGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /**
     * @notice Settings are updatable - See {GovernorSettings}.
     * Sets the name of the governor instance. See {IGovernor-name}.
     * Sets the token address used for voting.
     * Sets the address of the timelock contract.
     * Sets the initial values for the voting delay, voting period, proposal threshold, and quorum.
     * @param token_ The address of the token contract used for voting.
     * @param timelock_ The address of the TimelockController contract used for timelock control.
     * @param initialVotingDelay_ The delay between the execution of a proposal and the start of voting (seconds).
     * @param initialVotingPeriod_ The duration of the voting period for a proposal (seconds).
     * @param initialProposalThreshold_ The number of votes required in order for a voter to become a proposer.
     * @param initialQuorumNumerator_ The fraction of the total supply that is required for a proposal to pass.
     */
    constructor(
        IVotes token_,
        TimelockController timelock_,
        uint256 initialVotingDelay_,
        uint256 initialVotingPeriod_,
        uint256 initialProposalThreshold_,
        uint256 initialQuorumNumerator_
    )
        Governor("Nifty League Governor")
        GovernorSettings(initialVotingDelay_, initialVotingPeriod_, initialProposalThreshold_)
        GovernorVotes(token_)
        GovernorVotesQuorumFraction(initialQuorumNumerator_)
        GovernorTimelockControl(timelock_)
    {}

    /**
     * @inheritdoc GovernorSettings
     */
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    /**
     * @inheritdoc GovernorTimelockControl
     */
    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    /**
     * @inheritdoc GovernorTimelockControl
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc GovernorTimelockControl
     */
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @inheritdoc GovernorTimelockControl
     */
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @inheritdoc GovernorTimelockControl
     */
    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
