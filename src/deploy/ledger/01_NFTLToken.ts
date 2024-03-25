import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNFTLToken } from '~/scripts/deploy';
import { initNFTLToken } from '~/scripts/post-deploy';
import { getLedgerSigner } from '~/scripts/ledger';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { address: deployer } = await getLedgerSigner();
  const deployResult = await deployNFTLToken(hre, deployer);
  if (deployResult.newlyDeployed) await initNFTLToken(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NFTLToken'];
