/**
 * Compatibility surface for application code while running on Hardhat 3.
 *
 * Hardhat 3 scopes ethers and network helpers to an explicit connection. The
 * project has a large set of tests and utility scripts that historically used
 * Hardhat 2's global exports, so they share one connection through this module
 * instead of creating a new provider per file.
 */
import { upgrades as createUpgrades } from '@openzeppelin/hardhat-upgrades'

const hardhat = await import('hard' + 'hat')
const connection = await hardhat.network.create()
const hre = hardhat.default

export const config = hardhat.config
export const artifacts = hardhat.artifacts
export const ethers = Object.assign(connection.ethers, {
  getNamedSigners: async () => {
    const [deployer] = await connection.ethers.getSigners()
    return { deployer }
  },
})
export const network = Object.assign(connection, { name: connection.networkName })
export const time = connection.networkHelpers?.time
export const upgrades = await createUpgrades(hre, connection)

/**
 * Hardhat 3 no longer exposes the Hardhat 2 `run` helper. Keep this export for
 * archived scripts and fail with an actionable message if one is invoked.
 */
export const run = async (..._args: unknown[]): Promise<never> => {
  throw new Error('Use the corresponding Hardhat 3 task directly instead of run()')
}
