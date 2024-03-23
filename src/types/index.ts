import { Address } from 'hardhat-deploy/types';

export enum NetworkName {
  Mainnet = 'mainnet',
  Hardhat = 'hardhat',
  Sepolia = 'sepolia',
}

export type ContractAddressRecord = Partial<Record<NetworkName, Address>>;

export type DegenPurchaseArgs = [
  character: [bigint, bigint, bigint, bigint, bigint],
  head: [bigint, bigint, bigint],
  clothing: [bigint, bigint, bigint, bigint, bigint, bigint],
  accessories: [bigint, bigint, bigint, bigint, bigint, bigint],
  items: [bigint, bigint],
];
