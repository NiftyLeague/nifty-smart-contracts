# Nifty League Smart Contracts

Advanced Hardhat project for Nifty League's smart contracts across Ethereum (L1) and Immutable zkEVM (L2).

## Project Overview

- **Name**: `@niftyleague/smart-contracts`
- **Stack**: Hardhat + TypeScript + Solidity 0.8.19/0.8.20
- **Package manager**: `bun` (pinned `1.3.14` via `mise.toml`); Node pinned to `24.18.0`
- **Chains**: Ethereum mainnet/Sepolia + Immutable zkEVM (testnet/mainnet); L1↔L2 are companion networks

## Directory Layout

```
src/
  contracts/        Solidity sources (compiled by Hardhat)
    imx/            Immutable zkEVM contracts (NFTL, Governor, Marketplace, Store, ComicsBurner, etc.)
    lib/            Libraries & shared modules (MerkleDistributor, NameableCharacter, AllowedColorsStorage)
    interfaces/     Solidity interfaces
    mocks/          Test mocks (MockERC20/721/1155, MockVRFCoordinator, MockLinkToken, etc.)
    deprecated/     Legacy contracts kept for reference (do not deploy)
    external/       Vendored WETH (compiled with 0.4.18)
    utils/          Internal utilities (Bytes, Minting)
  deploy/
    ethereum/       L1 deployment scripts (run sequentially, prefixed with NN_)
    imx/            L2 (Immutable) deployment scripts
    hardhat/        Local mock + contract deployment for `hardhat` network
  test/             Hardhat/Chai contract tests (*.test.ts)
  scripts/          One-off TypeScript scripts (mint, deploy_test, merkle-distributor, etc.)
  constants/        Shared constants (addresses, colors, burn list, raffle data, etc.)
  types/            Generated typechain types + shared TS types (NetworkName, etc.)
bun-tests/          bun:test specs for framework-agnostic TS logic (NOT contract tests)
hardhat.config.ts   Hardhat config: networks, compilers, namedAccounts, typechain
slither.config.json Slither static analysis config
```

## Build, Lint, Test

| Task | Command |
| --- | --- |
| Install | `pnpm install` (postinstall links OZ symlinks via `scripts/setup-oz-symlinks.mjs`) |
| Compile | `pnpm build` (runs `hardhat clean && hardhat compile` via bun) |
| Format | `pnpm format` (TypeScript + Solidity) |
| Lint | `pnpm lint` (ESLint + Solhint) |
| Type-check | `pnpm type-check` |
| Contract tests (Hardhat) | `pnpm test:hardhat` (or `pnpm test` which runs `bun test bun-tests` for TS-only specs) |
| Coverage | `pnpm test:coverage` (runs `hardhat coverage` then `scripts/check-coverage.mjs`) |
| Slither | `pnpm slither` (emits `SLITHER.md`) |
| Single Hardhat test | `hardhat test src/test/<file>.test.ts --typecheck --network hardhat` |

Pre-commit hook (`.husky/pre-commit`) runs `bun lint-staged` → type-check, lint, and format staged files.

## Networks & Deployment

Defined in `hardhat.config.ts`. Default network is `mainnet`. Each network declares its `deploy/` directory and tags:

- `hardhat` — `src/deploy/hardhat`, tags: `test`, `local`
- `tenderly` — DevNet RPC, `src/deploy/ethereum`, tag: `local`
- `sepolia` — Tenderly gateway, `src/deploy/ethereum`, tag: `staging`
- `mainnet` — Tenderly gateway, **Ledger signer** (`NIFTY_LEDGER_DEPLOYER`), tag: `prod`
- `imtbl-zkevm-testnet` / `imtbl-zkevm-mainnet` — Immutable zkEVM, `src/deploy/imx`

Companion networks let L1 deploys read L2 state (and vice versa). `namedAccounts.deployer` routes the first signer on testnets/local and the Ledger address on mainnet + IMX mainnet.

Required env (see `.env.example`): `PRIVATE_KEY`, `TENDERLY_ACCESS_KEY`, `TENDERLY_DEV_NET`, `ETHERSCAN_API_KEY`, `BLOCKSCOUT_API_KEY`, `OZ_DEFENDER_API_KEY/SECRET`. Copy to `.env.local` (git-ignored).

## Solidity Conventions

- Pin to `0.8.19` (Immutable zkEVM requires ≤0.8.23). Configured compilers: `0.8.19` + `0.8.20`; `external/WETH.sol` overrides to `0.4.18`.
- Optimizer enabled, `runs: 200`.
- OpenZeppelin: pin `contracts` and `contracts-upgradeable` to `4.9.6`; v5 is aliased as `@openzeppelin/contracts-v5` (`5.1.0`).
- Solhint extends `solhint:recommended` + `prettier` plugin. Prettier formatting is an **error** (`"prettier/prettier": "error"`). Max states count `23`. Named parameters in mappings, leading underscore for private vars, gas-style rules enforced.
- Prettier: 4-space tabs for `.sol`, single quotes off, no bracket spacing; 2-space tabs, single quotes on for TS/JS, `printWidth: 120`, `trailingComma: "all"`.
- `slither.config.json` filters detector warnings; static analysis runs in CI.

## TypeScript Conventions

- Strict-ish via `tsconfig.json`; typechain output to `src/types/typechain` (ethers-v6 target).
- ES2021 target, `@typescript-eslint` parser; ESLint defers to Prettier.
- Scripts commonly import `hre`, `ethers`, and named accounts from `hardhat`; see `src/scripts/`.
- When running scripts through Hardhat, prefer `npx hardhat run src/scripts/<name>.ts` so `hre` is injected.

## Testing Notes

- All contract tests run on the `hardhat` network with `--typecheck`. Mocha timeout is set to a very large value in `hardhat.config.ts` — leave it alone.
- `bun-tests/` houses bun:test specs for non-Solidity code (constants, merkle helpers). `bunfig.toml` scopes `root = "./bun-tests"` and explicitly excludes `src/test` to prevent bun from picking up `.test.ts` files that require Hardhat.
- Coverage gate: `scripts/check-coverage.mjs` enforces a threshold after `hardhat coverage`.

## Common Workflows

- **Add a new L1 contract**: create `.sol` under `src/contracts/`, add a numbered deploy script under `src/deploy/ethereum/`, add tests in `src/test/`. Run `pnpm build && pnpm test:hardhat && pnpm lint`.
- **Add a new IMX contract**: mirror under `src/contracts/imx/` + `src/deploy/imx/`. Keep solidity ≤0.8.23.
- **Verify deployments**: `pnpm verify` (Etherscan for L1) or `pnpm verify:imx:mainnet` (Blockscout for IMX).
- **Export ABIs/addresses for client repos**: `pnpm export` (writes `exports/deployments.*.ts`, git-ignored).

## Things to Watch

- Never commit `.env`, `.env.local`, `artifacts/`, `cache/`, `coverage/`, `exports/`, or `node_modules/`.
- Mainnet deploys use Ledger — set `ETH_NETWORK`/signer config carefully; do not paste private keys into commit history.
- `external/WETH.sol` is vendored and uses a separate compiler — don't refactor its pragma.
- Deprecated contracts in `src/contracts/deprecated/` are reference only; do not redeploy.
