## Stack

**Solidity + Hardhat** — Solidity smart contracts managed with [Hardhat](https://hardhat.org/) v2.28.6, `hardhat-deploy` for deployments, and [TypeChain](https://github.com/dethcrypto/TypeChain) (ethers-v6) for type-safe contract bindings.

| Layer | Technology |
|-------|-----------|
| Language | Solidity (primary 0.8.19, secondary 0.8.20; WETH.sol overridden to 0.4.18) |
| Runtime | Hardhat + hardhat-deploy + hardhat-deploy-ethers |
| Tests | Mocha + Chai + @nomicfoundation/hardhat-chai-matchers |
| Package manager | `bun` (v1.3.14, specified via `packageManager` field) |
| TypeScript | TS 5.9, ts-node, tsconfig-paths |
| Libraries | OpenZeppelin Contracts (4.9.6) + Upgrades (4.9.6), Chainlink v1.5.0, Axelar ITS v1.2.4, @imtbl/contracts v3.1.1 |
| Linting | ESLint (TS), Solhint + prettier-plugin-solidity (Sol) |
| Static analysis | Slither (generates `SLITHER.md`) |
| Gas | hardhat-gas-reporter |
| Coverage | solidity-coverage |

Optimizer enabled, 200 runs across all versions.

---

## Commands

All commands use `bun run <script>` (or `bun <script>` since bun supports direct script names).

### Build & Test

```bash
bun compile          # hardhat clean && hardhat compile
bun test             # hardhat test --typecheck --network hardhat
bun coverage         # hardhat coverage
bun run test:coverage # coverage + check thresholds
```

### Lint & Format

```bash
bun format           # prettier (TS + Sol)
bun lint             # eslint TS + solhint
bun run type-check   # tsc --noEmit
bun run slither      # slither . --checklist --markdown-root ./ > SLITHER.md
```

### Deploy

```bash
bun run deploy:hardhat              # --network hardhat          (local)
bun run deploy:tenderly             # --network tenderly        (Tenderly DevNet)
bun run deploy:sepolia              # --network sepolia         (testnet)
bun run deploy:mainnet              # --network mainnet         (mainnet, Ledger)
bun run deploy:imx:testnet          # --network imtbl-zkevm-testnet
bun run deploy:imx:mainnet          # --network imtbl-zkevm-mainnet
```

### Verify & Export

```bash
bun run verify                      # hardhat etherscan-verify
bun run verify:imx:testnet          # verify on Immutable testnet explorer
bun run verify:imx:mainnet          # verify on Immutable mainnet explorer
bun run export                      # deploy + write exports/ for all networks
```

### Merkle Utilities

```bash
bun run generate-merkle-root                          # ts-node merkle-distributor/generate-merkle-root.ts
bun run generate-merkle-root:balance-manager          # same, with dynamic input
bun run verify-merkle-root                            # verify generated merkle root
```

---

## Entry Points

### Contracts (`src/contracts/`) — 44 `.sol` files

| Directory | Key Contracts |
|-----------|---------------|
| **root** | `NiftyDegen.sol`, `NFTLToken.sol` |
| **imx/** | `NiftyMarketplace.sol`, `NFTL.sol`, `Store.sol`, `ComicsBurner.sol`, `BalanceManagerDistributor.sol`, `NiftyGovernor.sol`, `Timelock.sol` |
| **lib/** | `MerkleDistributor.sol`, `MerkleDistributorWithDeadline.sol`, `NiftyLeagueCharacter.sol`, `NameableCharacter.sol`, `AllowedColorsStorage.sol`, `ERC20MetaTransactions.sol` |
| **interfaces/** | 9 interfaces (`IMerkleDistributor`, `IChildERC20`, `INiftyMarketplace`, `IGovToken`, `IMintable`, etc.) |
| **deprecated/** | 9 deprecated contracts (legacy `NiftyLaunchComics`, `BalanceManager`, `NiftyItemL2`, `NiftyBurningComicsL2`, `NiftyItemSale`, `NiftyEquipment`, `NFTLRaffle`, `HydraDistributor`, `NFTLTimelock`) |
| **mocks/** | 7 mock contracts (ERC20, ERC721, ERC1155, VRFCoordinator, etc.) |
| **utils/** | `Minting.sol`, `Bytes.sol` |
| **external/** | `WETH.sol` (compiled with Solidity 0.4.18) |

### Deploy Scripts (`src/deploy/`)

| Network path | Contents |
|--------------|----------|
| `ethereum/` | N1 `NFTLToken` → N2 `AllowedColorsStorage` → ... → N11 `POST_DEPLOY` |
| `imx/` | N1 `NiftyMarketplace` → N2 `NFTL` → ... → N8 `UpdateTimelock` |
| `hardhat/` | Mock contracts for local testing |

### Test Files (`src/test/`)

Tests live in `src/test/` and must be run with `--network hardhat`.

### Other Scripts (`src/scripts/`)

Utility scripts: `merkle-distributor/` (merkle root generation/verification helpers), `imx/` (mint, refresh metadata, interchain token service, contract roles), `ledger.ts`, `permit.ts`, `deploy.ts`, `degens.ts`, `mint.ts`, `deploy_test.ts`.

---

## Networks

| Network | Config Key | Deploy Dir | Signer | Tags |
|---------|-----------|------------|--------|------|
| Hardhat (local) | `hardhat` | `src/deploy/hardhat` | PRIVATE_KEY | `test`, `local` |
| Tenderly DevNet | `tenderly` | `src/deploy/ethereum` | PRIVATE_KEY | `local` |
| Sepolia (testnet) | `sepolia` | `src/deploy/ethereum` | PRIVATE_KEY | `staging` |
| Ethereum Mainnet | `mainnet` | `src/deploy/ethereum` | Ledger (NIFTY_LEDGER_DEPLOYER) | `prod` |
| Immutable zkEVM Testnet | `imtbl-zkevm-testnet` | `src/deploy/imx` | PRIVATE_KEY | `staging` |
| Immutable zkEVM Mainnet | `imtbl-zkevm-mainnet` | `src/deploy/imx` | Ledger (NIFTY_LEDGER_DEPLOYER) | `prod` |

Ethereum → Immutable zkEVM companion networks are configured for cross-chain ITS/axelar flows.

---

## Conventions & Gotchas

- **This is NOT a web app.** Never run `bun dev`, `bun start`, or `bun serve`. The only local server is `npx hardhat node` for a JSON-RPC endpoint.
- **All tests must use `--network hardhat`.** Tests in `src/test/` are Hardhat-network only.
- **Forbidden directories** (committed or auto-generated — never edit manually): `artifacts/`, `cache/`, `deployments/`, `typechain/`, `coverage/`, `.openzeppelin/`, `Flattened.sol`, `SLITHER.md`, `gasReporterOutput.json`.
- **Deployer selection**: Testnet/staging networks use `PRIVATE_KEY` from `.env` / `.env.local`. Mainnet/prod networks route through Ledger via `@nomicfoundation/hardhat-ledger` (accounts defined in `src/constants/addresses.ts` as `NIFTY_LEDGER_DEPLOYER`).
- **Hardhat config `paths`** remap standard paths: sources → `src/contracts/`, tests → `src/test/`. TypeChain output → `src/types/typechain/`.
- **Companion network pattern**: Ethereum L1 networks (sepolia/mainnet) declare `L2` companion pointing to the matching Immutable zkEVM network, and vice versa — used by `hardhat-deploy` for cross-chain deployment awareness.
- **Default network**: `mainnet` — be careful running commands without `--network`.
- **Solhint ignores** `src/contracts/external/` (vendored WETH.sol at 0.4.18).
- **Verification**: Etherscan for L1, Immutable explorer (custom `apiUrl`/`apiKey` per network in config) for L2.
- **Slither audit** runs in CI and outputs `SLITHER.md` — keep it regenerated and committed.
- **Environment**: Copy `.env.example` → `.env.local`. Required vars include `PRIVATE_KEY`, `TENDERLY_ACCESS_KEY`/`TENDERLY_DEV_NET`, `ETHERSCAN_API_KEY`, `INFURA_PROJECT_ID` or `ALCHEMY_API_KEY`, and `OZ_DEFENDER_API_KEY`/`OZ_DEFENDER_API_SECRET`.
- **`hardhat node`** requires `allowUnlimitedContractSize: true` (set for `hardhat` network) when deploying complex proxy chains.
