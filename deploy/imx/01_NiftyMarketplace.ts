import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/imx/01_NiftyMarketplace.ts',
  'NiftyMarketplace',
  ['imtbl-zkevm-testnet', 'imtbl-zkevm-mainnet']
)
