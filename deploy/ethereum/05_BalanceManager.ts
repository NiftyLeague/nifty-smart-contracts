import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/05_BalanceManager.ts',
  'BalanceManager',
  ['tenderly', 'sepolia', 'mainnet']
)
