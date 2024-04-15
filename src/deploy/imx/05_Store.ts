import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { NFTL, NiftyMarketplace, Store } from '~/types/typechain';
import { renounceContractRole, ADMIN_ROLE } from '~/scripts/imx/initContractRoles';
import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const niftyMarketplace = await hre.ethers.getContract<NiftyMarketplace>('NiftyMarketplace');
  const nftl = await hre.ethers.getContract<NFTL>('NFTL');
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
    const store = await hre.ethers.getContract<Store>('Store');
    await store.transferOwnership(NIFTY_LEDGER_DEPLOYER);
    console.log('✅ Complete');

    await renounceContractRole(ADMIN_ROLE, niftyMarketplace, deployer);
  }
};

module.exports = deployFunction;
deployFunction.tags = ['Store'];
