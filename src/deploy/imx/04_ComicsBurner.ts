import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { NiftyMarketplace } from '~/types/typechain';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const niftyMarketplace = await hre.ethers.getContract<NiftyMarketplace>('NiftyMarketplace');

  const comicsBurner = await deploy('ComicsBurner', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [await niftyMarketplace.getAddress()],
        },
      },
    },
  });

  if (comicsBurner.newlyDeployed) {
    console.log(`Granting ComicsBurner minter role...`);
    await niftyMarketplace.grantMinterRole(comicsBurner.address);
    console.log('✅ Complete');
  }
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyGovernor'];
