import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/04_NiftyLaunchComics.ts',
  'NiftyLaunchComics',
  ['tenderly', 'sepolia', 'mainnet']
)
