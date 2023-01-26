import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NFTL_TOKEN_ADDRESS, BALANCE_MANAGER_MAINTAINER } from '../../constants/addresses';
import { NetworkName } from '../../types';

const deployBalanceManager = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('BalanceManager', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [NFTL_TOKEN_ADDRESS[hre.network.name as NetworkName], BALANCE_MANAGER_MAINTAINER],
        },
      },
    },
  });
};
module.exports = deployBalanceManager;
deployBalanceManager.tags = ['BalanceManager'];
