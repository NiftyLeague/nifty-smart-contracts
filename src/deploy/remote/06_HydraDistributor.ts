import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { NIFTY_DAO_LEDGER } from '~/constants/addresses';

const deployHydraDistributor: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const degenContract = await hre.ethers.getContract('NiftyDegen');

  await deploy('HydraDistributor', {
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
          args: [await degenContract.getAddress(), NIFTY_DAO_LEDGER],
        },
      },
    },
  });
};

module.exports = deployHydraDistributor;
deployHydraDistributor.tags = ['HydraDistributor'];
