import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const STARK_CONTRACT_ADDRESS = '0x7917eDb51ecD6CdB3F9854c3cc593F33de10c623';

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
          args: [STARK_CONTRACT_ADDRESS],
        },
      },
    },
  });
};
module.exports = NiftyItemL2;
NiftyItemL2.tags = ['NiftyItemL2'];
