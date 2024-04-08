import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import type { NiftyMarketplace } from '~/types/typechain';
import { NetworkName } from '~/types';

import { NIFTY_LEDGER_DEPLOYER, OPERATOR_ALLOWLIST_ADDRESS } from '~/constants/addresses';
import { initContractRoles, MINTER_ROLE } from '~/scripts/imx/initContractRoles';
import { refreshMetadata } from '~/scripts/imx/refreshMetadata';
import { batchMintItems } from '~/scripts/imx/mintAssets';

const REFRESH_METADATA = false;

const COLLECTION = {
  owner: NIFTY_LEDGER_DEPLOYER,
  name: 'Nifty Marketplace',
  symbol: 'NIFTY',
  iconUrl: 'https://niftyleague.com/img/logo/full-bg.png',
  // Blockscout requires a '/' at the end of the Token Base URI to index metadata correctly
  baseUri: 'https://api.niftyleague.com/imx/marketplace/metadata/',
  contractUri: 'https://api.niftyleague.com/imx/marketplace/collection.json',
  royalties: {
    receiver: NIFTY_LEDGER_DEPLOYER,
    feeNumerator: 250, // 2.5%
  },
};

type DeploymentArgs = [
  owner: Address,
  name: string,
  baseURI: string,
  symbol: string,
  contractURI: string,
  operatorAllowlist: Address,
  receiver: Address,
  feeNumerator: number,
];

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const network = hre.network.name as NetworkName;

  const args: DeploymentArgs = [
    deployer,
    COLLECTION.name,
    COLLECTION.symbol,
    COLLECTION.baseUri,
    COLLECTION.contractUri,
    OPERATOR_ALLOWLIST_ADDRESS[network] as Address,
    COLLECTION.royalties.receiver,
    COLLECTION.royalties.feeNumerator,
  ];

  const deployResult = await deploy('NiftyMarketplace', { from: deployer, args, log: true });

  const contract = await hre.ethers.getContract<NiftyMarketplace>('NiftyMarketplace');

  if (deployResult.newlyDeployed) {
    // Config contract admin & minter roles
    await initContractRoles(network, contract, deployer);
    // Batch mint comics & items
    await batchMintItems(network, contract);
    // Revoke minter role from deployer
    await contract.revokeRole(MINTER_ROLE, deployer);
  } else if (REFRESH_METADATA) {
    // Refresh metadata for all tokens
    const comics = [1, 2, 3, 4, 5, 6];
    const items = [101, 102, 103, 104, 105, 106, 107];
    for (const tokenId of [...comics, ...items]) {
      await refreshMetadata(network, contract, tokenId);
    }
  }
};

module.exports = deployFunction;
deployFunction.tags = ['NiftyMarketplace'];
