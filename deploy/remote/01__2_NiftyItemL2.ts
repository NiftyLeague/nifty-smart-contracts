import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { STARK_CONTRACT_ADDRESS } from '../../constants/addresses';
import { NetworkName } from '../../types';

const NiftyItemL2: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('NiftyItemL2', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [STARK_CONTRACT_ADDRESS[hre.network.name as NetworkName]],
        },
      },
    },
  });
};
module.exports = NiftyItemL2;
NiftyItemL2.tags = ['NiftyItemL2'];
