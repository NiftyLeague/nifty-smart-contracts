import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import type { Timelock } from '~/types/typechain';
import { parseEther } from 'ethers';
import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';

// TODO: Replace with Deployed Gnosis Safe
const MULTI_SIG = NIFTY_LEDGER_DEPLOYER;

type TimelockArgs = [minDelay: number, proposers: Address[], executors: Address[], admin: Address];

type GovernorArgs = [
  token: Address,
  timelock: Address,
  initialVotingDelay: number,
  initialVotingPeriod: number,
  initialProposalThreshold: bigint,
  initialQuorumNumerator: number,
];

const SECONDS_IN_A_DAY = 86400;
// https://www.immutable.com/blog/under-the-hood-immutable-zkevm
const IMX_BLOCK_PERIOD = 2; // 2 seconds

// The delay before you can enact a vote after it passes (seconds).
const MIN_DELAY = (SECONDS_IN_A_DAY * 2) / IMX_BLOCK_PERIOD; // 2 days
// The delay between the execution of a proposal and the start of voting (seconds).
const VOTING_DELAY = SECONDS_IN_A_DAY / IMX_BLOCK_PERIOD; // 1 day
// The duration of the voting period for a proposal (seconds).
const VOTING_PERIOD = (SECONDS_IN_A_DAY * 7) / IMX_BLOCK_PERIOD; // 1 week
// The number of votes required in order for a voter to become a proposer.
const PROPOSAL_THRESHOLD = parseEther('100000'); // 100K tokens
// The fraction of the total supply that is required for a proposal to pass.
const QUORUM_NUMERATOR = 4; // 4% of supply. By default the denominator is 100.

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const signer = await hre.ethers.getSigner(deployer);

  const NFTLToken = await hre.deployments.get('NFTL');

  const timelockArgs: TimelockArgs = [MIN_DELAY, [], [], deployer];
  const Timelock = await deploy('Timelock', { from: deployer, args: timelockArgs, log: true });

  const govArgs: GovernorArgs = [
    NFTLToken.address,
    Timelock.address,
    VOTING_DELAY,
    VOTING_PERIOD,
    PROPOSAL_THRESHOLD,
    QUORUM_NUMERATOR,
  ];

  const Governor = await deploy('NiftyGovernor', { from: deployer, args: govArgs, log: true });

  if (Governor.newlyDeployed) {
    console.log(`Initializing Timelock roles...`);
    const timelockContract = await hre.ethers.getContract<Timelock>('Timelock', signer);
    // Grant proposer role to governor
    await timelockContract.grantRole(await timelockContract.PROPOSER_ROLE(), Governor.address);
    // Grant executer/cancel roles to multi-sig
    await timelockContract.grantRole(await timelockContract.EXECUTOR_ROLE(), MULTI_SIG);
    await timelockContract.grantRole(await timelockContract.CANCELLER_ROLE(), MULTI_SIG);
    // Revoke admin role from deployer
    await timelockContract.renounceRole(await timelockContract.TIMELOCK_ADMIN_ROLE(), deployer);
    console.log('✅ Complete');
  }
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyGovernor'];
