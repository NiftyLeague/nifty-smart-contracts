import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/hardhat/04_MockERC1155.ts',
  'MockERC1155',
  ['hardhat']
)
