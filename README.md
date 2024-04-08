# Nifty League Hardhat Project

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

## Setup Guide

### Install dependencies

```bash
yarn install
```

### Setup environment variables

Copy the `.env.example` file in this directory to `.env.local` (which will be ignored by Git):

```bash
cp .env.example .env.local
```

### Compile code

```bash
yarn build
```

This command uses `hardhat clean` to clear cache and delete all artifacts. It then runs `hardhat compile` to compile the entire project, building fresh artifacts.

## Testing

### Check code format

We use [Prettier](https://prettier.io/) for code formatting!

```bash
yarn format
```

This will run both `yarn format:ts` & `yarn format:sol` to write all files with the necessary plugins.

### Linting

For TypeScript files we use [ESLint](https://eslint.org/) and for Solidity files we use [Solhint](https://protofire.io/projects/solhint). You can run both with:

```bash
yarn format
```

If you want to run them individually use `yarn lint:ts` or `yarn lint:sol`

### TypeScript

To check TypeScript for the entire app, run the following command:

```bash
yarn type-check
```

### Solidity static analysis

We use [Slither](https://github.com/crytic/slither) in our CI pipeline to check and report any potential vulnerabilities in our contracts. You can also run this analyzer locally which will generate a `SLITHER.md` report. Run the following:

```bash
yarn slither
```

### Hardhat tests

Please write tests for all contracts in the `src/test/` folder. To run all use:

```bash
yarn test
```

You can also run a single test using:

```bash
yarn test src/test/{desired_test_script}  --network hardhat
```

> **Note:**
> All tests should be run on `hardhat` network!

## Deploying contracts

For deployment we use the [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) plugin. This plugin allows you to write deploy scripts in the `src/deploy` folder and declare nested deploy environments. Each deploy script in the selected build environment will run sequentially.

> **Note:** `yarn deploy` will run on the network selected with .env `ETH_NETWORK` using the default deploy directory listed in `hardhat.config.ts`

### Local Development:

Start a JSON-RPC server on top of Hardhat Network:

```bash
npx hardhat node
```

Deploy test contracts on Hardhat Network (this will deploy scripts sequentially in `src/deploy/hardhat`):

```bash
yarn deploy:hardhat
```

### Tenderly DevNet:

To use DevNets, go to [Tenderly](https://tenderly.co/devnets) and spawn a new DevNet. You will need to copy the RPC details into .env `TENDERLY_DEV_NET=<slug>/<devnet-id>`

You can now set `ETH_NETWORK` to "tenderly" or run:

```bash
yarn deploy:tenderly
```

### Testnet:

To deploy contracts using an account `PRIVATE_KEY` defined in `.env` on Testnet or Mainnet use:

```bash
yarn deploy:remote {network}
```

You can also deploy to our preferred testnet, [Sepolia](https://www.alchemy.com/faucets/ethereum-sepolia) using:

```bash
yarn deploy:sepolia
```

### Mainnet:

For mainnet deployment we use [Frame](https://frame.sh/) to deploy with a Ledger signer.

```bash
yarn deploy:ledger mainnet
```

## Export contracts

To export contracts for use in client repositories, run:

```bash
yarn export
```

This will create deployment files in `exports/` for both mainnet & sepolia which are git-ignored.

## Other scripts

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat node
npx hardhat help
npx hardhat coverage
npx hardhat run src/scripts/<script>.ts
```

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan.

Copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first follow the instructions above to deploy your contract(s).

#### Verify all deployments

To verify all deployments on your selected network, run:

```bash
yarn verify
```

This will use the `etherscan-verify` script from [hardhat-deploy](https://github.com/wighawag/hardhat-deploy?tab=readme-ov-file#4-hardhat-etherscan-verify) to quickly verify all deployments!

- `npx hardhat --network {network} etherscan-verify --api-key {etherscan_api_key}`

#### Verify specific deployment

If you instead want to target a specific deployment to verify:

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network {network} DEPLOYED_CONTRACT_ADDRESS
```

#### Verification issues?

You can try flattening the contract source code to manually submit for verification:

```shell
npx hardhat flatten src/contracts/Foo.sol > Flattened.sol
```

## Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

## Support

Email [andy@niftyleague.com](mailto:andy@niftyleague.com)

or

Join the [Nifty League Discord Server](https://discord.gg/niftyleague) and message a admin
