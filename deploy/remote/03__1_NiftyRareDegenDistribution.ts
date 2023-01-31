import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { DEGEN_ADDRESS, NIFTY_TEAM_SAFE } from '../../constants/addresses';
import { NetworkName } from '../../types';

const deployNiftyRareDegenDistribution: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('NiftyRareDegenDistribution', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [DEGEN_ADDRESS[hre.network.name as NetworkName], NIFTY_TEAM_SAFE],
        },
      },
    },
  });
};
module.exports = deployNiftyRareDegenDistribution;
deployNiftyRareDegenDistribution.tags = ['NiftyRareDegenDistribution'];
