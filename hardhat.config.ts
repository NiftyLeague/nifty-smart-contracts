import { defineConfig, task } from 'hardhat/config'
import hardhatLedger from '@nomicfoundation/hardhat-ledger'
import hardhatEthers from '@nomicfoundation/hardhat-ethers'
import hardhatEthersChaiMatchers from '@nomicfoundation/hardhat-ethers-chai-matchers'
import hardhatMocha from '@nomicfoundation/hardhat-mocha'
import hardhatVerify from '@nomicfoundation/hardhat-verify'
import hardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers'
import hardhatUpgrades from '@openzeppelin/hardhat-upgrades'
import hardhatDeploy from 'hardhat-deploy'

import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import { NIFTY_LEDGER_DEPLOYER } from './src/constants/addresses'
import { NetworkName } from './src/types'

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts').setInlineAction(async (_taskArgs, hre) => {
  const connection = (await hre.network.create()) as any
  const accounts = await connection.ethers.getSigners()

  for (const account of accounts) console.log(account.address)

  await connection.close()
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config = defineConfig({
  plugins: [
    hardhatLedger,
    hardhatEthers,
    hardhatEthersChaiMatchers,
    hardhatMocha,
    hardhatVerify,
    hardhatNetworkHelpers,
    hardhatUpgrades,
    hardhatDeploy,
  ],
  paths: {
    sources: './src/contracts',
    tests: './src/test',
  },
  solidity: {
    compilers: [
      {
        // solidity <=0.8.23 required: https://docs.immutable.com/docs/zkEVM/architecture/chain-differences#solidity-compatibility
        version: '0.8.19',
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
      {
        version: '0.8.20',
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
    default: {
      type: 'http',
      url: `https://mainnet.gateway.tenderly.co/${process.env.TENDERLY_ACCESS_KEY}`,
      ledgerAccounts: [NIFTY_LEDGER_DEPLOYER],
    },
    [NetworkName.Hardhat]: {
      type: 'edr-simulated',
      chainType: 'l1',
      allowUnlimitedContractSize: true,
      gas: 100_000_000,
      blockGasLimit: 100_000_000,
      transactionGasCap: false,
    },
    [NetworkName.Tenderly]: {
      type: 'http',
      url: `https://rpc.vnet.tenderly.co/devnet/${process.env.TENDERLY_DEV_NET}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    [NetworkName.Sepolia]: {
      type: 'http',
      // url: 'http://127.0.0.1:1248', // this is the RPC endpoint exposed by Frame
      // url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      // url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      url: `https://sepolia.gateway.tenderly.co/${process.env.TENDERLY_ACCESS_KEY}`,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    [NetworkName.Mainnet]: {
      type: 'http',
      // url: 'http://127.0.0.1:1248', // this is the RPC endpoint exposed by Frame
      // url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      // url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      url: `https://mainnet.gateway.tenderly.co/${process.env.TENDERLY_ACCESS_KEY}`,
      ledgerAccounts: [NIFTY_LEDGER_DEPLOYER],
    },
    // Immutable zkEVM: https://docs.immutable.com/docs/zkEVM/architecture/chain-config
    [NetworkName.IMXzkEVMTestnet]: {
      type: 'http',
      chainId: 13473,
      url: 'https://rpc.testnet.immutable.com',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    [NetworkName.IMXzkEVMMainnet]: {
      type: 'http',
      chainId: 13371,
      url: 'https://rpc.immutable.com',
      ledgerAccounts: [NIFTY_LEDGER_DEPLOYER],
    },
  },
  chainDescriptors: {
    '13473': {
      name: 'Immutable zkEVM Testnet',
      blockExplorers: {
        blockscout: {
          name: 'Immutable zkEVM Testnet Explorer',
          url: 'https://explorer.testnet.immutable.com',
          apiUrl: 'https://explorer.testnet.immutable.com/api/v2',
        },
      },
    },
    '13371': {
      name: 'Immutable zkEVM Mainnet',
      blockExplorers: {
        blockscout: {
          name: 'Immutable zkEVM Explorer',
          url: 'https://explorer.immutable.com',
          apiUrl: 'https://explorer.immutable.com/api/v2',
        },
      },
    },
  },
  test: {
    mocha: {
      timeout: 100000000,
    },
  },
  coverage: {
    skipFiles: ['mocks', 'interfaces', 'external'],
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY ?? '',
    },
    sourcify: { enabled: true },
  },
  defender: {
    apiKey: `${process.env.OZ_DEFENDER_API_KEY}`,
    apiSecret: `${process.env.OZ_DEFENDER_API_SECRET}`,
  },
})

export default config
