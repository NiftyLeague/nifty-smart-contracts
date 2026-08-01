import { createLegacyDeployScript } from '../../src/rocketh/legacy-deploy.js'

export default createLegacyDeployScript(
  '../../src/deploy/ethereum/11_POST_DEPLOY.ts',
  'PostDeploy',
  ['tenderly', 'sepolia', 'mainnet']
)
