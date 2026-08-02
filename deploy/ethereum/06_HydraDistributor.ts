import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/06_HydraDistributor.ts',
  'HydraDistributor',
  ['tenderly', 'sepolia', 'mainnet']
)
