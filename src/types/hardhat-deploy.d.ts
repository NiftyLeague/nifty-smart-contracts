declare module 'hardhat-deploy/types' {
  export type Address = string
  export type DeployResult = import('../rocketh/legacy').LegacyDeployment
  export type DeployFunction = ((
    hre: import('hardhat/types').HardhatRuntimeEnvironment
  ) => Promise<void>) & {
    tags?: string[]
    dependencies?: string[]
    skip?: (hre: import('hardhat/types').HardhatRuntimeEnvironment) => Promise<boolean>
  }
}
