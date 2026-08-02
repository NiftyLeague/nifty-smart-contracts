import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/hardhat/08_NiftyBurningComicsL2.ts',
  'NiftyBurningComicsL2',
  ['hardhat']
)
