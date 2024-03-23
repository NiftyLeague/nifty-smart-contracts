import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNiftyLaunchComics } from '~/scripts/deploy';
import { initNiftyLaunchComics } from '~/scripts/post-deploy';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const deployResult = await deployNiftyLaunchComics(hre, deployer);
  if (deployResult.newlyDeployed) await initNiftyLaunchComics(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyLaunchComics'];
