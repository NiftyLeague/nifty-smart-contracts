import { ethers } from 'hardhat';
import { type Block } from 'ethers';

export const getCurrentBlock = async (): Promise<Block> => {
  const blockNumber = await ethers.provider.getBlockNumber();
  return (await ethers.provider.getBlock(blockNumber)) as Block;
};

export const getCurrentBlockTimestamp = async (): Promise<bigint> => {
  const block = await getCurrentBlock();
  return BigInt(block.timestamp);
};
