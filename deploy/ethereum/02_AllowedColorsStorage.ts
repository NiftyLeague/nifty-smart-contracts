import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/02_AllowedColorsStorage.ts',
  'AllowedColorsStorage',
  ['tenderly', 'sepolia', 'mainnet']
)
