import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { BALANCE_MANAGER_MAINTAINER } from '~/constants/addresses';

const deployBalanceManager = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const nftlToken = await hre.ethers.getContract('NFTLToken');

  await deploy('BalanceManager', {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [await nftlToken.getAddress(), BALANCE_MANAGER_MAINTAINER],
        },
      },
    },
  });
};

module.exports = deployBalanceManager;
deployBalanceManager.tags = ['BalanceManager'];
