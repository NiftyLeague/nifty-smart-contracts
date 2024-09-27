import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { NFTL, NiftyMarketplace, Store } from '~/types/typechain';
import { renounceMarketplaceRole, ADMIN_ROLE } from '~/scripts/imx/contractRoles';
import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const signer = await hre.ethers.getSigner(deployer);

  const niftyMarketplace = await hre.ethers.getContract<NiftyMarketplace>('NiftyMarketplace', signer);
  const nftl = await hre.ethers.getContract<NFTL>('NFTL', signer);
  const treasury = NIFTY_LEDGER_DEPLOYER; // TODO: Change to multi-sig wallet

  const Store = await deploy('Store', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [await niftyMarketplace.getAddress(), await nftl.getAddress(), treasury],
        },
      },
    },
  });

  if (Store.newlyDeployed) {
    console.log(`Granting Store minter role & updating owner...`);
    await niftyMarketplace.grantMinterRole(Store.address);
    const store = await hre.ethers.getContract<Store>('Store', signer);
    await store.transferOwnership(NIFTY_LEDGER_DEPLOYER);
    console.log('✅ Complete');

    await renounceMarketplaceRole(ADMIN_ROLE, niftyMarketplace, deployer);
  }
};

module.exports = deployFunction;
deployFunction.tags = ['Store'];
deployFunction.skip = async () => true; // TODO: Remove this line when ready to deploy
