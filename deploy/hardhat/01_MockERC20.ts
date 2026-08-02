import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/hardhat/01_MockERC20.ts', 'MockERC20', [
  'hardhat',
])
