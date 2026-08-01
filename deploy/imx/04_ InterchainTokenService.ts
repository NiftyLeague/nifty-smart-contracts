import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/imx/04_ InterchainTokenService.ts',
  'InterchainTokenService',
  ['imtbl-zkevm-testnet', 'imtbl-zkevm-mainnet']
)
