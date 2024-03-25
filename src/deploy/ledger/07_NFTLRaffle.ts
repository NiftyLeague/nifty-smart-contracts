import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNFTLRaffle } from '~/scripts/deploy';
import { getLedgerSigner } from '~/scripts/ledger';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { address: deployer } = await getLedgerSigner();
  await deployNFTLRaffle(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NFTLRaffle'];
