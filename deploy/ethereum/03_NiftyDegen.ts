import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/03_NiftyDegen.ts',
  'NiftyDegen',
  ['tenderly', 'sepolia', 'mainnet']
)
