import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/imx/07_Store.ts', 'Store', [
  'imtbl-zkevm-testnet',
  'imtbl-zkevm-mainnet',
])
