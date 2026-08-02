import { extensions } from './config.js'
import type { Accounts, Data, Extensions } from './config.js'
import { setupEnvironmentFromFiles } from '@rocketh/node'
import { setupHardhatDeploy } from 'hardhat-deploy/helpers'

const { loadAndExecuteDeploymentsFromFiles } = setupEnvironmentFromFiles<
  Extensions,
  Accounts,
  Data
>(extensions)
const { loadEnvironmentFromHardhat } = setupHardhatDeploy<Extensions, Accounts, Data>(extensions)

export { loadAndExecuteDeploymentsFromFiles, loadEnvironmentFromHardhat }
