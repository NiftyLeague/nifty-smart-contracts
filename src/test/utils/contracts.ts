import { ethers } from 'hardhat';
import type { MockERC20, MockERC721, MockERC1155, NFTLToken, NiftyDegen, NiftyLaunchComics } from '~/types/typechain';

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
