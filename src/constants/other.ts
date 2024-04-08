import { NetworkName } from '../types';

const network = process.env.ETH_NETWORK as NetworkName;

const MAINNET_NETWORKS = [NetworkName.Mainnet, NetworkName.IMXzkEVMMainnet];

// NFTL Daily Emissions
export const NFTL_EMISSION_START = 1631685007;
export const NFTL_EMISSION_END = 1726293007;

// Metadata
export const BASE_METADATA_URI = `https://${MAINNET_NETWORKS.includes(network) ? '' : 'staging.'}api.niftyleague.com`;
export const BASE_DEGENS_URI = `https://api.niftyleague.com/${network}/degen/metadata/`;
export const BASE_COMICS_URI = `https://api.niftyleague.com/imx/comics/metadata/{id}`;

// NFTL Raffle
export const PENDING_PERIOD = 1209600; // 17 days (multiply days by 86400)
export const TOTAL_WINNER_TICKET_COUNT = 17;

// Immutable X
export const IMX_BASE_API = `https://api.${MAINNET_NETWORKS.includes(network) ? '' : 'sandbox.'}immutable.com/v1`;

export const gasOverrides = {
  maxPriorityFeePerGas: (11e9).toString(), // 11 gwei
  maxFeePerGas: (15e9).toString(), // 15 gwei
  gasLimit: 5_000_000, // Set an appropriate gas limit for your transaction
};
