import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { NIFTY_LEDGER_DEPLOYER } from '../../constants/addresses';

const deployBalanceManager: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // get contracts
  const MockERC20 = await hre.deployments.get('MockERC20');

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
          args: [MockERC20.address, NIFTY_LEDGER_DEPLOYER],
        },
      },
    },
  });
};
module.exports = deployBalanceManager;
deployBalanceManager.tags = ['BalanceManager'];
