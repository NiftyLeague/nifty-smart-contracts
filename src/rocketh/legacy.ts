import { artifacts as hardhatArtifacts, network as hardhatNetwork } from 'hardhat'
import { loadEnvironmentFromFiles } from '@rocketh/node'

export type Address = `0x${string}`

export type LegacyDeployment = {
  address: Address
  abi: readonly unknown[]
  newlyDeployed?: boolean
  [key: string]: unknown
}

export type LegacyDeployFunction = ((hre: LegacyHardhatRuntimeEnvironment) => Promise<void>) & {
  tags?: string[]
  dependencies?: string[]
  skip?: (hre: LegacyHardhatRuntimeEnvironment) => Promise<boolean>
}

export type LegacyHardhatRuntimeEnvironment = {
  ethers: any
  network: { name: string; provider: any }
  companionNetworks: Record<
    string,
    { deployments: { get(name: string): Promise<LegacyDeployment> } }
  >
  deployments: {
    deploy(name: string, options: Record<string, any>): Promise<LegacyDeployment>
    get(name: string): Promise<LegacyDeployment>
    execute(
      name: string,
      options: { from: Address },
      method: string,
      ...args: any[]
    ): Promise<unknown>
  }
  getNamedAccounts(): Promise<Record<string, Address>>
  getChainId(): Promise<string>
}

type RockethEnvironment = any

const companionNetworkNames: Record<string, Record<string, string>> = {
  sepolia: { L2: 'imtbl-zkevm-testnet' },
  mainnet: { L2: 'imtbl-zkevm-mainnet' },
  'imtbl-zkevm-testnet': { L1: 'sepolia' },
  'imtbl-zkevm-mainnet': { L1: 'mainnet' },
}

const readArtifact = async (name: string) => hardhatArtifacts.readArtifact(name)

const asExecution = (value: any) => {
  if (!value) return undefined
  if (typeof value === 'string') return { init: value }
  if ('methodName' in value) return { init: value }
  return value
}

export const createLegacyHardhatRuntime = async (
  env: RockethEnvironment
): Promise<LegacyHardhatRuntimeEnvironment> => {
  const connection = env.extra?.connection ?? (await hardhatNetwork.create())
  const baseEthers = connection.ethers

  const ethers = Object.assign(baseEthers, {
    getContract: async <T = any>(name: string, signer?: any): Promise<T> => {
      const deployment = env.get(name)
      return baseEthers.getContractAt(name, deployment.address, signer) as Promise<T>
    },
    getNamedSigners: async () => {
      const namedAccounts = env.namedAccounts as Record<string, Address>
      return Object.fromEntries(
        await Promise.all(
          Object.entries(namedAccounts).map(async ([name, address]) => [
            name,
            await baseEthers.getSigner(address),
          ])
        )
      )
    },
  })

  const deployments = {
    get: async (name: string) => env.get(name) as LegacyDeployment,
    deploy: async (name: string, options: Record<string, any>) => {
      const account = options.from as Address
      const artifact = await readArtifact(name)
      const args = options.args ?? []

      if (options.proxy) {
        const proxy = options.proxy
        const proxyContract =
          proxy.proxyContract === 'OpenZeppelinTransparentProxy'
            ? {
                type: 'SharedAdminOpenZeppelinTransparentProxy' as const,
                proxyAdminName: proxy.viaAdminContract ?? 'DefaultProxyAdmin',
              }
            : proxy.proxyContract

        return env.deployViaProxy(
          name,
          { account, artifact, args },
          {
            proxyContract,
            execute: asExecution(proxy.execute),
          }
        ) as Promise<LegacyDeployment>
      }

      return env.deploy(
        name,
        { account, artifact, args },
        options.skipIfAlreadyDeployed ? { skipIfAlreadyDeployed: true } : undefined
      ) as Promise<LegacyDeployment>
    },
    execute: async (name: string, options: { from: Address }, method: string, ...args: any[]) => {
      const deployment = env.get(name)
      return env.execute(deployment, {
        account: options.from,
        functionName: method,
        args,
      })
    },
  }

  const companionNetworks = Object.fromEntries(
    Object.entries(companionNetworkNames[env.name] ?? {}).map(([key, networkName]) => [
      key,
      {
        deployments: {
          get: async (name: string) => {
            const companionConnection = await hardhatNetwork.create(networkName)
            const companionEnvironment = await loadEnvironmentFromFiles({
              provider: companionConnection.provider,
              environment: networkName,
              saveDeployments: false,
              extra: { connection: companionConnection },
            })
            return companionEnvironment.get(name) as LegacyDeployment
          },
        },
      },
    ])
  )

  return {
    ethers,
    network: { name: env.name, provider: connection.provider },
    companionNetworks,
    deployments,
    getNamedAccounts: async () => env.namedAccounts,
    getChainId: async () => String(env.network.chain.id),
  }
}
