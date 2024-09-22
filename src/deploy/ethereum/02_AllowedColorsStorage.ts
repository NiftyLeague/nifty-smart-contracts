import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployColorsStorage } from '~/scripts/deploy';
import { initColorsStorage } from '~/scripts/post-deploy';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const deployResult = await deployColorsStorage(hre, deployer);
  if (deployResult.newlyDeployed) await initColorsStorage(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['AllowedColorsStorage'];
