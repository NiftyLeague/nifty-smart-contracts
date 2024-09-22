import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomicfoundation/hardhat-ledger';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-deploy-ethers';
import 'hardhat-deploy';

import { config as dotEnvConfig } from 'dotenv';
import 'tsconfig-paths/register';
dotEnvConfig();

import { NIFTY_LEDGER_DEPLOYER } from './src/constants/addresses';
import { NetworkName } from './src/types';

// Select the network you want to deploy to here:
const defaultNetwork = process.env.ETH_NETWORK;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  defaultNetwork,
  paths: {
    sources: './src/contracts',
    tests: './src/tests',
  },
  solidity: {
    compilers: [
      {
        // solidity <=0.8.23 required: https://docs.immutable.com/docs/zkEVM/architecture/chain-differences#solidity-compatibility
        version: '0.8.19',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
    overrides: {
      'src/contracts/external/WETH.sol': {
        version: '0.4.18',
      },
    },
  },
  networks: {
    [NetworkName.Hardhat]: {
      allowUnlimitedContractSize: true,
      deploy: ['src/deploy/hardhat'],
      tags: ['test', 'local'],
    },
    [NetworkName.Tenderly]: {
      url: `https://rpc.vnet.tenderly.co/devnet/${process.env.TENDERLY_DEV_NET}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      deploy: ['src/deploy/ethereum'],
      saveDeployments: false,
      tags: ['local'],
    },
    [NetworkName.Sepolia]: {
      // url: 'http://127.0.0.1:1248', // this is the RPC endpoint exposed by Frame
      // url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      // url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      url: `https://sepolia.gateway.tenderly.co/${process.env.TENDERLY_ACCESS_KEY}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      companionNetworks: { L2: NetworkName.IMXzkEVMTestnet }, // https://github.com/wighawag/hardhat-deploy?tab=readme-ov-file#companionnetworks
      deploy: ['src/deploy/ethereum'],
      tags: ['staging'],
    },
    [NetworkName.Mainnet]: {
      // url: 'http://127.0.0.1:1248', // this is the RPC endpoint exposed by Frame
      // url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      // url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      url: `https://mainnet.gateway.tenderly.co/${process.env.TENDERLY_ACCESS_KEY}`,
      ledgerAccounts: [NIFTY_LEDGER_DEPLOYER],
      companionNetworks: { L2: NetworkName.IMXzkEVMMainnet }, // https://github.com/wighawag/hardhat-deploy?tab=readme-ov-file#companionnetworks
      deploy: ['src/deploy/ethereum'],
      tags: ['prod'],
    },
    // Immutable zkEVM: https://docs.immutable.com/docs/zkEVM/architecture/chain-config
    [NetworkName.IMXzkEVMTestnet]: {
      chainId: 13473,
      url: 'https://rpc.testnet.immutable.com',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      companionNetworks: { L1: NetworkName.Sepolia }, // https://github.com/wighawag/hardhat-deploy?tab=readme-ov-file#companionnetworks
      deploy: ['src/deploy/imx'],
      tags: ['staging'],
      verify: {
        etherscan: {
          apiUrl: 'https://explorer.testnet.immutable.com/api/v2',
          apiKey: process.env.BLOCKSCOUT_API_KEY,
        },
      },
    },
    [NetworkName.IMXzkEVMMainnet]: {
      chainId: 13371,
      url: 'https://rpc.immutable.com',
      ledgerAccounts: [NIFTY_LEDGER_DEPLOYER],
      companionNetworks: { L1: NetworkName.Mainnet }, // https://github.com/wighawag/hardhat-deploy?tab=readme-ov-file#companionnetworks
      deploy: ['src/deploy/imx'],
      tags: ['prod'],
      verify: {
        etherscan: {
          apiUrl: 'https://explorer.immutable.com/api/v2',
          apiKey: process.env.BLOCKSCOUT_API_KEY,
        },
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // default assign the first account as deployer
      13371: 1, // for IMXzkEVMMainnet, assign the second account as deployer
    },
  },
  gasReporter: {
    enabled: true,
    gasPrice: 50,
    currency: 'USD',
  },
  mocha: {
    timeout: 100000000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  sourcify: { enabled: true },
  defender: {
    apiKey: `${process.env.OZ_DEFENDER_API_KEY}`,
    apiSecret: `${process.env.OZ_DEFENDER_API_SECRET}`,
  },
  typechain: {
    outDir: 'src/types/typechain',
    target: 'ethers-v6',
  },
};

export default config;
