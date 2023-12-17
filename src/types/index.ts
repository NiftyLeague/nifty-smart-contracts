import { Address } from 'hardhat-deploy/types';

export enum NetworkName {
  Mainnet = 'mainnet',
  Goerli = 'goerli',
  Hardhat = 'hardhat',
}

export type ContractAddressRecord = Partial<Record<NetworkName, Address>>;
