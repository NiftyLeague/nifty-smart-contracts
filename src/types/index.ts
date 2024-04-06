import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployResult } from 'hardhat-deploy/types';

export enum NetworkName {
  Hardhat = 'hardhat',
  Mainnet = 'mainnet',
  Sepolia = 'sepolia',
  Tenderly = 'tenderly',
  IMXzkEVMTestnet = 'imtbl-zkevm-testnet',
  IMXzkEVMMainnet = 'imtbl-zkevm-mainnet',
}

export type ContractAddressRecord = Partial<Record<NetworkName, Address>>;

export type DegenPurchaseArgs = [
  character: [bigint, bigint, bigint, bigint, bigint],
  head: [bigint, bigint, bigint],
  clothing: [bigint, bigint, bigint, bigint, bigint, bigint],
  accessories: [bigint, bigint, bigint, bigint, bigint, bigint],
  items: [bigint, bigint],
];

export interface DeployFunctionExt {
  (hre: HardhatRuntimeEnvironment, deployer: Address): Promise<DeployResult>;
}

export interface PostDeployFunction {
  (hre: HardhatRuntimeEnvironment, deployer: Address, deployResult?: DeployResult): Promise<void>;
}
