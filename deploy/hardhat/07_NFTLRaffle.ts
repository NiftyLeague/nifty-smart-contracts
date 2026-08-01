import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript('../../src/deploy/hardhat/07_NFTLRaffle.ts', 'NFTLRaffle', [
  'hardhat',
])
