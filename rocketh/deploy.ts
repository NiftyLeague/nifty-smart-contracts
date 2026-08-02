import { extensions } from './config.js'
import type { Accounts, Data, Extensions } from './config.js'
import { setupDeployScripts } from 'rocketh'

const { deployScript } = setupDeployScripts<Extensions, Accounts, Data>(extensions)

export { deployScript }
