import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { getLedgerSigner } from '../../scripts/utils';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const deployBalanceManager = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const deployer = await getLedgerSigner();

  await deploy('BalanceManager', {
    from: await deployer.getAddress(),
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [process.env.NFTL_TOKEN_ADDRESS, process.env.MAINTAINER_ADDRESS],
        },
      },
    },
  });
};
module.exports = deployBalanceManager;
deployBalanceManager.tags = ['BalanceManager'];
