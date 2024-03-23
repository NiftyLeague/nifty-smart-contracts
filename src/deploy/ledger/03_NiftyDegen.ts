import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNiftyDegen } from '~/scripts/deploy';
import { initNiftyDegen } from '~/scripts/post-deploy';
import { getLedgerSigner } from '~/scripts/ledger';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { address: deployer } = await getLedgerSigner();
  const deployResult = await deployNiftyDegen(hre, deployer);
  if (deployResult.newlyDeployed) await initNiftyDegen(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyDegen'];
