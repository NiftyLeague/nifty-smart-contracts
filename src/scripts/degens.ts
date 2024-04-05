import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address } from 'hardhat-deploy/types';
import type { DegenPurchaseArgs } from '~/types';
import { CHARACTER_TRAITS_MAP } from '~/constants/degens';

const splitTraitList = (characterTraits: number[], start: number, end: number): bigint[] => {
  return characterTraits.slice(start, end).map(trait => BigInt(trait));
};

export const getCharacterTraits = (tokenId: bigint): DegenPurchaseArgs | null => {
  const characterTraits = CHARACTER_TRAITS_MAP[Number(tokenId)];
  if (!characterTraits) return null;

  const character = splitTraitList(characterTraits, 0, 5);
  const head = splitTraitList(characterTraits, 5, 8);
  const clothing = splitTraitList(characterTraits, 8, 14);
  const accessories = splitTraitList(characterTraits, 14, 20);
  const items = splitTraitList(characterTraits, 20, 22);

  return [character, head, clothing, accessories, items] as DegenPurchaseArgs;
};

export const burnDegen = async (hre: HardhatRuntimeEnvironment, from: Address, tokenId: number) => {
  const { execute } = hre.deployments;
  const to = '0x0000000000000000000000000000000000000001';
  await execute('NiftyDegen', { from, log: true }, 'safeTransferFrom(address,address,uint256)', from, to, tokenId);
};
