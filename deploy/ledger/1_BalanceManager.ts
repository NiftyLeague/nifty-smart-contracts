const { config: dotenvConfig } = require('dotenv');
const path = require('path');
const ethProvider = require('eth-provider');

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const getLedgerSigner = async () => {
  const frame = ethProvider('frame');
  const ledgerSigner = (await frame.request({ method: 'eth_requestAccounts' }))[0];
  const { Web3Provider } = hre.ethers.providers;
  const provider = new Web3Provider(frame);

  return provider.getSigner(ledgerSigner);
};

const deployBalanceManager = async hre => {
  const { deploy } = hre.deployments;
  const deployer = await getLedgerSigner();

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
