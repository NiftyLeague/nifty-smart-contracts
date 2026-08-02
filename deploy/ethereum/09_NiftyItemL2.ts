import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/09_NiftyItemL2.ts',
  'NiftyItemL2',
  ['tenderly', 'sepolia', 'mainnet']
)
