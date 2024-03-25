import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address } from 'hardhat-deploy/types';
import type { NiftyDegen } from '~/types/typechain';
import { getCharacterTraits } from '~/scripts/degens';

export const mintNFTL = async (hre: HardhatRuntimeEnvironment, from: Address, args: [to: Address, amount: bigint]) => {
  const { execute } = hre.deployments;
  await execute('NFTLToken', { from, log: true }, 'mint', ...args);
};

export const batchMintComics = async (
  hre: HardhatRuntimeEnvironment,
  from: Address,
  args: [to: Address, ids: number[], amounts: bigint[], data: Uint8Array],
) => {
  const { execute } = hre.deployments;
  await execute('NiftyLaunchComics', { from, log: true }, 'mintBatch', ...args);
};

export const mintDegen = async (hre: HardhatRuntimeEnvironment, from: Address, to?: Address) => {
  const degenContract = await hre.ethers.getContract<NiftyDegen>('NiftyDegen');
  const totalSupply = await degenContract.totalSupply();
  const tokenId = totalSupply + 1n;

  const purchaseArgs = getCharacterTraits(tokenId);
  if (!purchaseArgs) throw new Error('Invalid tokenId');

  const { execute } = hre.deployments;
  await execute('NiftyDegen', { from, log: true }, 'purchase', ...purchaseArgs);
  if (to && to !== from)
    await execute('NiftyDegen', { from, log: true }, 'safeTransferFrom(address,address,uint256)', from, to, tokenId);
};
