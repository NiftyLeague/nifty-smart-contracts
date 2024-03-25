import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployHydraDistributor } from '~/scripts/deploy';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  await deployHydraDistributor(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['HydraDistributor'];
