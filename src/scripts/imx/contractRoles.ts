import type { Address } from 'hardhat-deploy/types';
import type { NiftyMarketplace, NFTL } from '~/types/typechain';
import { NIFTY_HOT_DEPLOYER, NIFTY_LEDGER_DEPLOYER, MINTER_API_ADDRESS } from '~/constants/addresses';
import { NetworkName } from '~/types';

export const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const BRIDGE_ROLE = '0x52ba824bfabc2bcfcdf7f0edbb486ebb05e1836c90e78047efeb949990f72e5f';
export const MINTER_ROLE = '0x4d494e5445525f524f4c45000000000000000000000000000000000000000000';

export const initMarketplaceRoles = async (network: NetworkName, contract: NiftyMarketplace, deployer: Address) => {
  console.log(`Initializing NiftyMarketplace roles...`);
  await contract.grantMinterRole(NIFTY_HOT_DEPLOYER);
  await contract.grantMinterRole(NIFTY_LEDGER_DEPLOYER);
  await contract.grantMinterRole(MINTER_API_ADDRESS[network] as Address);
  const hasAdminRole = await contract.hasRole(ADMIN_ROLE, NIFTY_LEDGER_DEPLOYER);
  if (!hasAdminRole) await contract.grantRole(ADMIN_ROLE, NIFTY_LEDGER_DEPLOYER);
  console.log('✅ Complete');
};

export const renounceMarketplaceRole = async (role: string, contract: NiftyMarketplace, address: Address) => {
  console.log(`Renouncing NiftyMarketplace role for ${address}...`);
  if (await contract.hasRole(role, address)) await contract.renounceRole(role, address);
  console.log('✅ Complete');
};

export const initNFTLRoles = async (network: NetworkName, contract: NFTL, deployer: Address) => {
  console.log(`Initializing NFTL roles...`);
  const hasAdminRole = await contract.hasRole(ADMIN_ROLE, NIFTY_LEDGER_DEPLOYER);
  if (!hasAdminRole) await contract.grantRole(ADMIN_ROLE, NIFTY_LEDGER_DEPLOYER);
  console.log('✅ Complete');
};

export const renounceNFTLRole = async (role: string, contract: NFTL, address: Address) => {
  console.log(`Renouncing NFTL role for ${address}...`);
  if (await contract.hasRole(role, address)) await contract.renounceRole(role, address);
  console.log('✅ Complete');
};
