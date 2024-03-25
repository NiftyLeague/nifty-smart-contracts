import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployColorsStorage } from '~/scripts/deploy';
import { initColorsStorage } from '~/scripts/post-deploy';
import { getLedgerSigner } from '~/scripts/ledger';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { address: deployer } = await getLedgerSigner();
  const deployResult = await deployColorsStorage(hre, deployer);
  if (deployResult.newlyDeployed) await initColorsStorage(hre, deployer);
};

module.exports = deployFunction;
deployFunction.tags = ['AllowedColorsStorage'];
