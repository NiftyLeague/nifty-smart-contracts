import type { Address } from 'hardhat-deploy/types';
import type { NiftyMarketplace } from '~/types/typechain';
import { NIFTY_LEDGER_DEPLOYER, MINTER_API_ADDRESS } from '~/constants/addresses';
import { NetworkName } from '~/types';

export const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const MINTER_ROLE = '0x4d494e5445525f524f4c45000000000000000000000000000000000000000000';

export const initContractRoles = async (network: NetworkName, contract: NiftyMarketplace, deployer: Address) => {
  console.log(`Initializing NiftyMarketplace roles...`);
  await contract.grantMinterRole(deployer);
  await contract.grantMinterRole(NIFTY_LEDGER_DEPLOYER);
  await contract.grantMinterRole(MINTER_API_ADDRESS[network] as Address);
  await contract.grantRole(ADMIN_ROLE, NIFTY_LEDGER_DEPLOYER);
  await contract.revokeRole(ADMIN_ROLE, deployer);
  console.log('✅ Complete');
};
