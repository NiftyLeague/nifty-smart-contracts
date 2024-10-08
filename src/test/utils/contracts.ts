import { ethers } from 'hardhat';
import type {
  MockERC1155,
  MockERC20,
  MockERC721,
  NFTL,
  NFTLToken,
  NiftyDegen,
  NiftyLaunchComics,
  NiftyMarketplace,
} from '~/types/typechain';
import { OPERATOR_ALLOWLIST_ADDRESS } from '~/constants/addresses';
import { NetworkName } from '~/types';

export const deployMockERC20 = async (): Promise<MockERC20> => {
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  return (await MockERC20.deploy()) as unknown as MockERC20;
};

export const deployMockERC721 = async (): Promise<MockERC721> => {
  const MockERC721 = await ethers.getContractFactory('MockERC721');
  return (await MockERC721.deploy()) as unknown as MockERC721;
};

export const deployMockERC1155 = async (): Promise<MockERC1155> => {
  const MockERC1155 = await ethers.getContractFactory('MockERC1155');
  return (await MockERC1155.deploy()) as unknown as MockERC1155;
};

export const deployNFTL = async (): Promise<NFTLToken> => {
  return (await deployMockERC20()) as NFTLToken;
};

export const deployDegens = async (): Promise<NiftyDegen> => {
  return (await deployMockERC721()) as unknown as NiftyDegen;
};

export const deployComics = async (): Promise<NiftyLaunchComics> => {
  return (await deployMockERC1155()) as unknown as NiftyLaunchComics;
};

export const deployChildNFTL = async (): Promise<NFTL> => {
  const deployer = (await ethers.getNamedSigners()).deployer;
  // Mock bridge address so deployer can mint tokens
  const bridgeAddress = deployer.address; // BRIDGE_PROXY_ADDRESS[NetworkName.IMXzkEVMTestnet] as `0x${string}`;
  const NFTLToken = await deployNFTL();
  const rootToken = await NFTLToken.getAddress();
  const TOKEN = { name: 'Nifty League', symbol: 'NFTL' };

  const NFTL = await ethers.getContractFactory('NFTL');
  return (await NFTL.deploy(bridgeAddress, rootToken, TOKEN.name, TOKEN.symbol)) as NFTL;
};

export const deployMarketplace = async (): Promise<NiftyMarketplace> => {
  const deployer = (await ethers.getNamedSigners()).deployer;
  const COLLECTION = {
    name: 'Nifty Marketplace',
    symbol: 'NIFTY',
    baseUri: 'https://api.niftyleague.com/imx/marketplace/metadata/',
    contractUri: 'https://api.niftyleague.com/imx/marketplace/collection.json',
    royalties: { receiver: deployer, feeNumerator: 250 },
    operatorAllowlist: OPERATOR_ALLOWLIST_ADDRESS[NetworkName.IMXzkEVMTestnet] as `0x${string}`,
  };

  const NiftyMarketplace = await ethers.getContractFactory('NiftyMarketplace');
  return (await NiftyMarketplace.deploy(
    deployer,
    COLLECTION.name,
    COLLECTION.symbol,
    COLLECTION.baseUri,
    COLLECTION.contractUri,
    COLLECTION.operatorAllowlist,
    COLLECTION.royalties.receiver,
    COLLECTION.royalties.feeNumerator,
  )) as NiftyMarketplace;
};
