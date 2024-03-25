import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNiftyDegen } from '~/scripts/deploy';
import { initNiftyDegen } from '~/scripts/post-deploy';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const deployResult = await deployNiftyDegen(hre, deployer);
  if (deployResult.newlyDeployed) await initNiftyDegen(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyDegen'];
