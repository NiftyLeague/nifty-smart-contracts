## Stack

- **Toolchain**: Bun-only. `packageManager: bun@1.3.14`, Node `24.18.0`. Pinned in `mise.toml`; CI installs via `jdx/mise-action` (no `actions/setup-node`).
- **Contracts**: Hardhat `^2.28.6` + `@nomicfoundation/hardhat-toolbox ^5.0.0`. Solidity compilers `0.8.19` + `0.8.20` (IMX zkEVM needs ≤0.8.23, do not raise). Optimizer on, `runs: 200`. `external/WETH.sol` is vendored with pragma `0.4.18` — leave it.
- **TypeScript**: TS `^5.9.3`, ES2021, `ethers` v6, `hardhat-deploy`, `hardhat-ignition`, `typechain` (ethers-v6) → `src/types/typechain` (gitignored).
- **OpenZeppelin**: pin `contracts` + `contracts-upgradeable` at `4.9.6`. v5 aliased as `@openzeppelin/contracts-v5@5.1.0`. Both coexist via `scripts/setup-oz-symlinks.mjs` run from `postinstall` (copies, do not convert to a real symlink).
- **Linters/formatters**: `solhint ^5.2.0` (extends `solhint:recommended` + prettier plugin; prettier diffs are **errors**), `eslint ^8.57.1` + `@typescript-eslint v7`, `prettier ^3.9.5` (+ `prettier-plugin-solidity`). `slither` for static analysis.
- **Tests**: two distinct runners — `bun:test` for TS-only logic, **Hardhat + Mocha + Chai** for Solidity. There is no vitest/jest. `bunfig.toml` scopes bun to `./bun-tests` and excludes `src/test` so bun never tries to run Hardhat tests.

## Commands

All scripts are `bun run <name>` (Bun proxies to node for Hardhat). `packageManager: bun@1.3.14` — never invoke `npm`, `pnpm`, or `yarn`.

| Script                                          | What it does                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`                 | Install. Triggers `postinstall` → `scripts/setup-oz-symlinks.mjs` (OZ v4/v5 layout).                                                         |
| `bun run build`                                 | Alias of `bun run compile` → `hardhat clean && hardhat compile`. **Required before `type-check`** — generates gitignored `typechain-types/`. |
| `bun run compile`                               | Same as `build`.                                                                                                                             |
| `bun run test`                                  | `bun test bun-tests` — bun:test runner over `bun-tests/**`. **Not** the Solidity suite.                                                      |
| `bun run test:hardhat`                          | `hardhat test --typecheck --network hardhat` — Mocha + Chai, the Solidity contract suite in `src/test/`.                                     |
| `bun run coverage`                              | `hardhat coverage`, then `scripts/check-coverage.mjs` enforces the threshold.                                                                |
| `bun run lint`                                  | `bun lint:ts && bun lint:sol` → ESLint (TS/JS, `--fix`) + solhint (`src/contracts/**/*.sol`).                                                |
| `bun run lint:sol`                              | solhint only.                                                                                                                                |
| `bun run type-check` / `bun run type:check`     | `tsc --noEmit`. Both script names exist; they are identical.                                                                                 |
| `bun run format`                                | `bun format:ts && bun format:sol` → prettier (TS/JS) + prettier-plugin-solidity (`src/contracts/**/*.sol`).                                  |
| `bun run format:check`                          | `prettier --ignore-path .prettierignore --check .` (CI gate).                                                                                |
| `bun run slither`                               | `slither . --checklist --markdown-root ./` → writes `SLITHER.md`.                                                                            |
| `bun run deploy:<network>`                      | `hardhat deploy --network <network>` (networks: `hardhat`, `tenderly`, `sepolia`, `mainnet`, `imtbl-zkevm-testnet`, `imtbl-zkevm-mainnet`).  |
| `bun run export`                                | Deploy to all four live networks, export ABIs/addresses → `exports/deployments.*.ts` (gitignored).                                           |
| `bun run verify` / `bun run verify:imx:mainnet` | Etherscan (L1) / Blockscout (IMX) verification.                                                                                              |

Pre-commit: `.husky/pre-commit` → `bun lint-staged` (type-check + lint + format on staged files via `.lintstagedrc.js`).

## Structure

```
hardhat.config.ts         Networks (mainnet default), compilers, namedAccounts, typechain
slither.config.json       Slither detector filters
mise.toml                 Toolchain pins: node 24.18.0, bun 1.3.14
bunfig.toml               bun:test scoped to ./bun-tests, excludes src/test
.lintstagedrc.js          Pre-commit pipeline (.ts / .sol / .md|.json)
.mocharc.json             Mocha config for Hardhat test runner
.solhint.json / .solhintignore
.prettierrc / .prettierignore

src/
  contracts/              Solidity sources
    imx/                  IMX zkEVM contracts (NFTL, Governor, Marketplace, Store, ComicsBurner, …)
    lib/                  Libraries (MerkleDistributor, NameableCharacter, AllowedColorsStorage, …)
    interfaces/           Solidity interfaces
    mocks/                Test mocks (MockERC20/721/1155, MockVRFCoordinator, MockLinkToken, …)
    deprecated/           Reference only — never redeploy
    external/             Vendored WETH (pragma 0.4.18, separate compiler)
    utils/                Internal utilities (Bytes, Minting)
  deploy/
    ethereum/             L1 scripts (NN_ prefix, run sequentially)
    imx/                  IMX scripts
    hardhat/              Local mocks + contracts for `hardhat` network
  test/                   Hardhat/Mocha/Chai contract tests (*.test.ts) — never `bun test` these
  scripts/                One-off TS scripts (mint, deploy_test, merkle-distributor, …)
  constants/              Shared constants (addresses, colors, burn list, raffle data, …)
  types/                  typechain-generated (gitignored) + shared TS types
  data/                   Seed JSON (merkle results, dynamodb snapshots)

bun-tests/                bun:test specs for framework-agnostic TS logic only
  constants.test.ts
  parse-balance-map.test.ts

scripts/                  Repo tooling
  setup-oz-symlinks.mjs   postinstall — OZ v4 + v5 coexistence (copy, not symlink)
  check-coverage.mjs      Coverage threshold gate

artifacts/  cache/  coverage/  typechain-types/  exports/  deployments/   (all gitignored)
```

## Conventions & Gotchas

- **Bun-only**. `packageManager: bun@1.3.14` in `package.json` + `engines.node: 24.18.0`. Toolchain pinned in `mise.toml`; CI matches locally via `jdx/mise-action`. Never `npm i`, `pnpm i`, `yarn`. Never invoke `node` directly for scripts — `bun run` proxies correctly to Hardhat/Solhint/etc.
- **Pinned versions are load-bearing**. Do **not** run a Hardhat 3 migration. Do **not** upgrade: `hardhat ^2.28.6`, `@nomicfoundation/hardhat-toolbox ^5.0.0`, `@openzeppelin/contracts@4.9.6`, `@openzeppelin/contracts-upgradeable@4.9.6`. The Dependabot auto-merge flow has broken every one of these in the past. Bump deliberately, then run `bun run test:hardhat && bun run test:coverage`.
- **Husky + lint-staged are active**. `git commit` runs `bun lint-staged` (type-check + eslint + prettier on `.ts`, solhint + prettier on `.sol`, prettier on `.md|.json`). Never `git commit --no-verify` to bypass — fix the staged failure.
- **Test runners are two different systems**. (1) `bun run test` = `bun test bun-tests` over `bun-tests/**` (TS-only). (2) `bun run test:hardhat` = `hardhat test --typecheck --network hardhat` = Mocha + Chai for Solidity. `bunfig.toml` excludes `src/test` so bun never touches the Hardhat suite; do not move contract tests into `bun-tests/`. Single Solidity file: `npx hardhat test src/test/<file>.test.ts --typecheck --network hardhat`.
- **`type-check` must run after `compile`**. `tsc --noEmit` consumes typechain bindings emitted by Hardhat into `src/types/typechain` (gitignored). Running `bun run type-check` on a fresh clone without first running `bun run build` will fail with "cannot find module". Order: `build` → `type-check`.
- **OZ v4 + v5 coexistence**. v5 is installed as `@openzeppelin/contracts-v5` and `postinstall` runs `scripts/setup-oz-symlinks.mjs` which **copies** v4 contracts into the v5 directory layout (not a symlink — keep it as a copy so cold installs work). If imports break after an OZ reinstall, re-run `bun install` to retrigger `postinstall`. Do not commit the symlink script's output.
- **Solidity ceiling is 0.8.23**. IMX zkEVM rejects higher. Configured compilers are `0.8.19` (default) and `0.8.20`; do not add a `0.8.24+` profile. `external/WETH.sol` overrides to `0.4.18` — never refactor its pragma.
- **Default network is `mainnet`**. Hardhat config sets it; `hardhat deploy` without `--network` will hit mainnet. Always pass `--network hardhat` for local work, or set `ETH_NETWORK` explicitly. Mainnet + IMX mainnet signers are Ledger (`NIFTY_LEDGER_DEPLOYER`); testnets use the first signer. `.env.local` (gitignored) is where `PRIVATE_KEY`, `TENDERLY_*`, `ETHERSCAN_API_KEY`, `BLOCKSCOUT_API_KEY`, `OZ_DEFENDER_*` live — never commit.
- **Mocha timeout is intentionally large** in `hardhat.config.ts` (deploy/IMX RPC calls). Don't lower it; CI will flake.
- **Linting**: prettier diffs are a **solhint error**. `lint:sol` will fail on unformatted `.sol` — run `bun run format` first. ESLint defers to prettier; don't add formatting rules to `.eslintrc.js`.
- **Slither runs in CI**; `slither.config.json` filters detector noise. New high/medium findings will fail the gate — fix or explicitly filter in `slither.config.json` with a justification.
- **Gitignored but produced locally**: `artifacts/`, `cache/`, `coverage/`, `coverage.json`, `typechain-types/`, `exports/`, `deployments/`, `.env.local`, `node_modules/`. Never `git add -f` these.
- **Networks are companion**: L1 deploys read L2 state (and vice versa) via `hardhat.config.ts` companion network entries. If you add a new network, wire both sides or deploys will fork.
