import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { NIFTY_TEAM_SAFE } from '../../constants/addresses';

const deployHydraDistributor: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // get contracts
  const MockERC721 = await hre.deployments.get('MockERC721');

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
          args: [MockERC721.address, NIFTY_TEAM_SAFE],
        },
      },
    },
  });
};
module.exports = deployHydraDistributor;
deployHydraDistributor.tags = ['HydraDistributor'];