import { ZeroHash } from 'ethers';
import { BASE_METADATA_URI } from '~/constants/other';
import type { NiftyMarketplace } from '~/types/typechain';
import { NetworkName } from '~/types';

type Snapshot = {
  address: string;
  ids: number[];
  values: number[];
}[];

export const batchMintItems = async (network: NetworkName, contract: NiftyMarketplace) => {
  const snapshot = await fetch(`${BASE_METADATA_URI}/imx/snapshot/combined`).then(
    res => res.json() as unknown as Snapshot,
  );
  console.log(`Minting items to ${snapshot.length} holders...`);
  for (const { address, ids, values } of snapshot) {
    await contract.safeMintBatch(address, ids, values, ZeroHash);
  }
  console.log('✅ Complete');
};
