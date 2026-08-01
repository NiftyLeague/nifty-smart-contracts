import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/10_ InterchainTokenService.ts',
  'InterchainTokenService',
  ['tenderly', 'sepolia', 'mainnet']
)
