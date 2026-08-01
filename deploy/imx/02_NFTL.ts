import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/imx/02_NFTL.ts', 'NFTL', [
  'imtbl-zkevm-testnet',
  'imtbl-zkevm-mainnet',
])
