import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/hardhat/05_BalanceManager.ts',
  'BalanceManager',
  ['hardhat']
)
