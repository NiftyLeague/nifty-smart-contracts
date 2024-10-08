import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { ComicsBurner, NiftyMarketplace } from '~/types/typechain';
import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const signer = await hre.ethers.getSigner(deployer);

  const niftyMarketplace = await hre.ethers.getContract<NiftyMarketplace>('NiftyMarketplace', signer);

  const ComicsBurner = await deploy('ComicsBurner', {
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

  if (ComicsBurner.newlyDeployed) {
    console.log(`Granting ComicsBurner minter role & updating owner...`);
    await niftyMarketplace.grantMinterRole(ComicsBurner.address);
    const comicsBurner = await hre.ethers.getContract<ComicsBurner>('ComicsBurner', signer);
    await comicsBurner.transferOwnership(NIFTY_LEDGER_DEPLOYER);
    console.log('✅ Complete');
  }
};

module.exports = deployFunction;
deployFunction.tags = ['ComicsBurner'];
deployFunction.skip = async () => true; // TODO: Remove this line when ready to deploy
