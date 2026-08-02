import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/hardhat/03_MockERC721.ts', 'MockERC721', [
  'hardhat',
])
