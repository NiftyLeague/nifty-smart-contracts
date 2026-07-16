import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import type { NiftyGovernor } from '~/types/typechain';
import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';

// TODO: Replace with Deployed Gnosis Safe
const MULTI_SIG = NIFTY_LEDGER_DEPLOYER;

type TimelockArgs = [minDelay: number, proposers: Address[], executors: Address[], admin: Address];

const SECONDS_IN_A_DAY = 86400;
// https://www.immutable.com/blog/under-the-hood-immutable-zkevm
const IMX_BLOCK_PERIOD = 2; // 2 seconds

// The delay before you can enact a vote after it passes (seconds).
const MIN_DELAY = (SECONDS_IN_A_DAY * 2) / IMX_BLOCK_PERIOD; // 2 days

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  // const signer = await hre.ethers.getSigner(deployer);

  const GOV_ADDRESS = (await hre.deployments.get('NiftyGovernor')).address;
  const timelockArgs: TimelockArgs = [MIN_DELAY, [GOV_ADDRESS], [GOV_ADDRESS], deployer];
  const Timelock = await deploy('Timelock', { from: deployer, args: timelockArgs, log: true });

  if (Timelock.newlyDeployed) {
    console.log(`Updating Timelock for NiftyGovernor...`);
    const governorContract = await hre.ethers.getContract<NiftyGovernor>('NiftyGovernor');
    await governorContract.updateTimelock(Timelock.address);
    // console.log(`Initializing Timelock roles...`);
    // const timelockContract = await hre.ethers.getContract<Timelock>('Timelock', signer);
    // // Grant proposer role to governor
    // await timelockContract.grantRole(await timelockContract.PROPOSER_ROLE(), Governor.address);
    // // Grant executer/cancel roles to multi-sig
    // await timelockContract.grantRole(await timelockContract.EXECUTOR_ROLE(), MULTI_SIG);
    // await timelockContract.grantRole(await timelockContract.CANCELLER_ROLE(), MULTI_SIG);
    // // Revoke admin role from deployer
    // await timelockContract.renounceRole(await timelockContract.TIMELOCK_ADMIN_ROLE(), deployer);
    console.log('✅ Complete');
  }
};

module.exports = deployFunction;
deployFunction.tags = ['UpdateTimelock'];
