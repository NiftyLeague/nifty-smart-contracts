import type { UserConfig } from 'rocketh/types'
import { NIFTY_LEDGER_DEPLOYER } from '../src/constants/addresses.js'

export const config = {
  accounts: {
    deployer: {
      default: 0,
      1: NIFTY_LEDGER_DEPLOYER,
      13371: NIFTY_LEDGER_DEPLOYER,
    },
  },
  data: {},
} as const satisfies UserConfig

import * as deployExtension from '@rocketh/deploy'
import * as proxyExtension from '@rocketh/proxy'
import * as readExecuteExtension from '@rocketh/read-execute'

export const extensions = {
  ...deployExtension,
  ...proxyExtension,
  ...readExecuteExtension,
}

export type Extensions = typeof extensions
export type Accounts = typeof config.accounts
export type Data = typeof config.data
