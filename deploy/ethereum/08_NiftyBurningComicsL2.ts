import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/08_NiftyBurningComicsL2.ts',
  'NiftyBurningComicsL2',
  ['tenderly', 'sepolia', 'mainnet']
)
