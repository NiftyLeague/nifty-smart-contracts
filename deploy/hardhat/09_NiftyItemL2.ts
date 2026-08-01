import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/hardhat/09_NiftyItemL2.ts',
  'NiftyItemL2',
  ['hardhat']
)
