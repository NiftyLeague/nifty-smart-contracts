import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const NiftyBurningComicsL2: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const comicsContract = await hre.ethers.getContract('NiftyLaunchComics');

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
          args: [await comicsContract.getAddress()],
        },
      },
    },
  });
};

module.exports = NiftyBurningComicsL2;
NiftyBurningComicsL2.tags = ['NiftyBurningComicsL2'];
