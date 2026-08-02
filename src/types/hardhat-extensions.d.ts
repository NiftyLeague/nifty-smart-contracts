import 'hardhat/types/hre'
import 'hardhat/types/network'
import 'hardhat/types'

declare module 'hardhat/types' {
  interface HardhatRuntimeEnvironment {
    deployments: any
    ethers: {
      getContract<T = unknown>(...args: any[]): Promise<T>
      getContractAt<T = unknown>(...args: any[]): Promise<T>
      [key: string]: any
    }
    companionNetworks: any
    getNamedAccounts(): Promise<Record<string, string>>
    getChainId(): Promise<string>
  }
}

declare module 'hardhat/types/hre' {
  interface HardhatRuntimeEnvironment {
    deployments: any
    ethers: {
      getContract<T = unknown>(...args: any[]): Promise<T>
      getContractAt<T = unknown>(...args: any[]): Promise<T>
      [key: string]: any
    }
    companionNetworks: any
    getNamedAccounts(): Promise<Record<string, string>>
    getChainId(): Promise<string>
  }
}

declare module 'hardhat/types/network' {
  interface NetworkManager {
    name: string
  }
}
