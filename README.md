# Nifty League Hardhat Project

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

## Developer instructions

### Install dependencies

```bash
yarn install
```

### Set up environment variables

Copy the `.env.example` file in this directory to `.env.local` (which will be ignored by Git):

```bash
cp .env.example .env.local
```

### Compile code

Compiles the entire project, building all artifacts

```bash
yarn build
```

### Run tests

```bash
yarn test ./test/{desired_test_script}
```

### Deploy code

For deployment we use the [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) plugin. This plugin allows you to write deploy scripts in the `src/deploy` folder and declare nested deploy environments. Each deploy script in the selected build environment will run sequentially.

#### Local Development:

Start a JSON-RPC server on top of Hardhat Network:

```bash
npx hardhat node
```

Deploy test contracts on Hardhat Network (this will deploy scripts sequentially in `src/deploy/hardhat`):

```bash
yarn deploy:hardhat
```

#### Testnet:

To deploy contracts using an account `PRIVATE_KEY` defined in `.env` on Testnet or Mainnet use:

```bash
yarn deploy:remote {network}
```

#### Mainnet:

For mainnet deployment we use [Frame](https://frame.sh/) to deploy with a Ledger signer.

```bash
yarn deploy:ledger mainnet
```

### Export contracts

To export contracts for use in client repositories, run:

```bash
yarn export
```

This will create deployment files in `exports/` for both mainnet & sepolia which are git-ignored.

### Other scripts

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run src/scripts/deploy.ts
TS_NODE_FILES=true npx ts-node src/scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'src/contracts/**/*.sol'
npx solhint 'src/contracts/**/*.sol' --fix
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

## Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

## Support

Email [andy@niftyleague.com](mailto:andy@niftyleague.com)

or

Join the [Nifty League Discord Server](https://discord.gg/niftyleague) and message a admin
