import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@tenderly/hardhat-tenderly';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'hardhat-deploy';
import 'tsconfig-paths/register';

import { resolve } from 'path';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: resolve(__dirname, './.env') });

// Select the network you want to deploy to here:
const defaultNetwork = process.env.HARDHAT_NETWORK;

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
        version: '0.8.11',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      deploy: ['src/deploy/hardhat/'],
    },
    local: {
      url: 'http://localhost:8545',
      deploy: ['src/deploy/hardhat/'],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      deploy: ['src/deploy/remote/'],
    },
    mainnet: {
      url: 'http://127.0.0.1:1248', // this is the RPC endpoint exposed by Frame
      deploy: ['src/deploy/ledger/'],
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
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },
  typechain: {
    outDir: 'src/types/typechain',
    target: 'ethers-v6',
  },
};

export default config;
