import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { DEGEN_ADDRESS, NIFTY_DAO_LEDGER } from '~/constants/addresses';
import { NetworkName } from '~/types';

const deployHydraDistributor: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('HydraDistributor', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [DEGEN_ADDRESS[hre.network.name as NetworkName], NIFTY_DAO_LEDGER],
        },
      },
    },
  });
};
module.exports = deployHydraDistributor;
deployHydraDistributor.tags = ['HydraDistributor'];
