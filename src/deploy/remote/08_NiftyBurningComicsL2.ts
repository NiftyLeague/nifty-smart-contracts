import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNiftyBurningComicsL2 } from '~/scripts/deploy';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  await deployNiftyBurningComicsL2(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyBurningComicsL2'];
