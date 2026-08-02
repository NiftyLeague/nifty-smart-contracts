import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/07_NFTLRaffle.ts',
  'NFTLRaffle',
  ['tenderly', 'sepolia', 'mainnet']
)
