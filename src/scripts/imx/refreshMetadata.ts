import { BASE_METADATA_URI, IMX_BASE_API } from '~/constants/other';
import type { NiftyMarketplace } from '~/types/typechain';
import { NetworkName } from '~/types';

export async function refreshMetadata(network: NetworkName, contract: NiftyMarketplace, tokenId: string | number) {
  console.log(`⚠️  Refreshing Immutable data for tokenID:`, tokenId);
  const address = await contract.getAddress();
  const metadata = await fetch(`${BASE_METADATA_URI}/imx/marketplace/metadata/${tokenId}`).then(res => res.json());

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-immutable-api-key':
        network === NetworkName.IMXzkEVMMainnet
          ? (process.env.MAINNET_IMX_API_KEY as string)
          : (process.env.TESTNET_IMX_API_KEY as string),
    },
    body: JSON.stringify({
      nft_metadata: [
        {
          ...metadata,
          // 400 if not provided
          animation_url: '',
          youtube_url: '',
        },
      ],
    }),
  };

  const refreshAPI = `${IMX_BASE_API}/chains/${network}/collections/${address}/nfts/refresh-metadata`;
  const response = await fetch(refreshAPI, options);

  if (response.status < 400) {
    console.log('✅ Immutable metadata refreshed');
    return response.json();
  } else {
    console.error('❌ Immutable metadata refresh failed:', response.statusText);
    return null;
  }
}
