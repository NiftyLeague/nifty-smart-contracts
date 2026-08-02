import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/hardhat/06_HydraDistributor.ts',
  'HydraDistributor',
  ['hardhat']
)
