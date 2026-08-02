import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/ethereum/01_NFTLToken.ts', 'NFTLToken', [
  'tenderly',
  'sepolia',
  'mainnet',
])
