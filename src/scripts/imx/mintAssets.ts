import { ZeroHash } from 'ethers';
import { BASE_METADATA_URI } from '~/constants/other';
import { HOLDER_LIST } from '~/constants/snapshot_marketplaceMigration';
import type { NiftyMarketplace } from '~/types/typechain';
import { NetworkName } from '~/types';

type Snapshot = {
  address: string;
  ids: number[];
  values: number[];
}[];

// Manual migration safe-check list
const SKIP_ADDRESSES = HOLDER_LIST;

export const batchMintItems = async (network: NetworkName, contract: NiftyMarketplace) => {
  const snapshot = await fetch(`${BASE_METADATA_URI(network)}/imx/snapshot/combined`).then(
    res => res.json() as unknown as Snapshot,
  );
  console.log(`Minting items to ${snapshot.length} holders...`);
  for (const { address, ids, values } of snapshot) {
    if (SKIP_ADDRESSES.includes(address)) continue;
    const tx = await contract.safeMintBatch(address, ids, values, ZeroHash);
    await new Promise(resolve => setTimeout(resolve, 15000)); // ~5 calls per minute rate limit
    tx.wait(20);
    console.log(`${address},`);
  }
  console.log('✅ Complete');
};
