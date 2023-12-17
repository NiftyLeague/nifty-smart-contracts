import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const NiftyBurningComicsL2: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const MockERC1155 = await hre.deployments.get('MockERC1155');

  await deploy('NiftyBurningComicsL2', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [MockERC1155.address],
        },
      },
    },
  });
};
module.exports = NiftyBurningComicsL2;
NiftyBurningComicsL2.tags = ['NiftyBurningComicsL2'];
