import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployNiftyItemL2 } from '~/scripts/deploy';
import { getLedgerSigner } from '~/scripts/ledger';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { address: deployer } = await getLedgerSigner();
  await deployNiftyItemL2(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyItemL2'];
