import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/imx/05_BalanceManagerDistributor.ts',
  'BalanceManagerDistributor',
  ['imtbl-zkevm-testnet', 'imtbl-zkevm-mainnet']
)
