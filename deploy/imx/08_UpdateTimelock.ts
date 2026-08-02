import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/imx/08_UpdateTimelock.ts',
  'UpdateTimelock',
  ['imtbl-zkevm-testnet', 'imtbl-zkevm-mainnet']
)
