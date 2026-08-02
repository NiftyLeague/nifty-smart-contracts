import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/imx/03_NiftyGovernor.ts',
  'NiftyGovernor',
  ['imtbl-zkevm-testnet', 'imtbl-zkevm-mainnet']
)
