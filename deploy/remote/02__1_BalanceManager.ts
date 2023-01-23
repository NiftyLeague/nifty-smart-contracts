const { config: dotenvConfig } = require('dotenv');
const path = require('path');

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const deployBalanceManager = async hre => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('BalanceManager', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [process.env.NFTL_TOKEN_ADDRESS, process.env.MAINTAINER_ADDRESS],
        },
      },
    },
  });
};
module.exports = deployBalanceManager;
deployBalanceManager.tags = ['BalanceManager'];
