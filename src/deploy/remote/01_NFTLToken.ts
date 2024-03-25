import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNFTLToken } from '~/scripts/deploy';
import { initNFTLToken } from '~/scripts/post-deploy';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const deployResult = await deployNFTLToken(hre, deployer);
  if (deployResult.newlyDeployed) await initNFTLToken(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NFTLToken'];
