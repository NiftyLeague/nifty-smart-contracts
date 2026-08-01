import { defineConfig } from 'hardhat/config'

import baseConfig from './hardhat.config'

export default defineConfig({
  ...baseConfig,
  paths: {
    ...baseConfig.paths,
    sources: './.coverage-contracts',
  },
})
