import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { NetworkName } from '~/types';
import { NIFTY_LAUNCH_COMICS_ADDRESS } from '~/constants/addresses';

const NiftyBurningComicsL2: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

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
          args: [NIFTY_LAUNCH_COMICS_ADDRESS[hre.network.name as NetworkName]],
        },
      },
    },
  });
};
module.exports = NiftyBurningComicsL2;
NiftyBurningComicsL2.tags = ['NiftyBurningComicsL2'];
