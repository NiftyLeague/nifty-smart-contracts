import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getLedgerSigner } from '~/scripts/ledger';
import { DEGEN_ADDRESS, NIFTY_DAO_LEDGER } from '~/constants/addresses';
import { NetworkName } from '~/types';

const deployHydraDistributor: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;

  try {
    const deployer = await getLedgerSigner();

    await deploy('HydraDistributor', {
      from: await deployer.getAddress(),
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
  } catch (err) {
    console.error('\nFailed in the HydraDistributor contract deployment using the ledger\n');
    console.error(err);
  }
};
module.exports = deployHydraDistributor;
deployHydraDistributor.tags = ['HydraDistributor'];
