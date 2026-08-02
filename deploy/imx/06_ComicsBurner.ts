import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/imx/06_ComicsBurner.ts', 'ComicsBurner', [
  'imtbl-zkevm-testnet',
  'imtbl-zkevm-mainnet',
])
