## Description

<!-- Summarize the change. Link to any related issues. -->

## CI Status (do not merge until all pass)

- [ ] `Compile` — `bun run compile` (or `bunx hardhat compile`)
- [ ] `Lint & Format Check` — `bun run lint:sol && bun run format:check`
- [ ] `Test` — `bun run test:hardhat`
- [ ] Slither static analysis passes (if applicable)

## Compliance Checklist

- [ ] My commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): message`)
- [ ] No hardcoded contract addresses, private keys, or secrets in source
- [ ] No floating Solidity pragma — version is pinned (`^0.8.19` / `^0.8.20`)
- [ ] All `external`/`public` functions have proper natspec (`@param`, `@return`)
- [ ] New dependencies use `bun add <pkg>`, not `npm`/`pnpm`/`yarn`
- [ ] No `.env*.local`, `node_modules`, `artifacts/`, `cache/`, or `typechain-types/` committed
- [ ] No generated artifacts committed (ABI exports, deployment artifacts, etc.)

## Additional Context

<!-- Anything reviewers should know: migration steps, deployment considerations, gas implications, security notes, related PRs. -->
