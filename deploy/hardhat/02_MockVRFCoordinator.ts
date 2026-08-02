import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/hardhat/02_MockVRFCoordinator.ts',
  'MockVRFCoordinator',
  ['hardhat']
)
