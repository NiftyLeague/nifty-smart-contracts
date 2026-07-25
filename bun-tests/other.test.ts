import { describe, expect, it } from 'bun:test';
import {
  NFTL_EMISSION_START,
  NFTL_EMISSION_END,
  TOTAL_WINNER_TICKET_COUNT,
  PENDING_PERIOD,
  BASE_METADATA_URI,
  BASE_DEGENS_URI,
  BASE_COMICS_URI,
  IMX_BASE_API,
  gasOverrides,
} from '../src/constants/other';
import { NetworkName } from '../src/types';

describe('emission window', () => {
  it('starts before it ends', () => {
    expect(NFTL_EMISSION_START).toBeLessThan(NFTL_EMISSION_END);
  });

  it('emission start is a known timestamp (Sep 2021)', () => {
    expect(NFTL_EMISSION_START).toBe(1_631_685_007);
  });

  it('emission end is a known timestamp (Sep 2024)', () => {
    expect(NFTL_EMISSION_END).toBe(1_726_293_007);
  });
});

describe('BASE_METADATA_URI', () => {
  it('returns production URL for mainnet', () => {
    expect(BASE_METADATA_URI(NetworkName.Mainnet)).toBe('https://api.niftyleague.com');
  });

  it('returns production URL for IMX mainnet', () => {
    expect(BASE_METADATA_URI(NetworkName.IMXzkEVMMainnet)).toBe('https://api.niftyleague.com');
  });

  it('returns staging URL for sepolia', () => {
    expect(BASE_METADATA_URI(NetworkName.Sepolia)).toBe('https://staging.api.niftyleague.com');
  });

  it('returns staging URL for IMX testnet', () => {
    expect(BASE_METADATA_URI(NetworkName.IMXzkEVMTestnet)).toBe('https://staging.api.niftyleague.com');
  });

  it('returns staging URL for hardhat (local)', () => {
    expect(BASE_METADATA_URI(NetworkName.Hardhat)).toBe('https://staging.api.niftyleague.com');
  });

  it('returns staging URL for tenderly', () => {
    expect(BASE_METADATA_URI(NetworkName.Tenderly)).toBe('https://staging.api.niftyleague.com');
  });
});

describe('BASE_DEGENS_URI', () => {
  it('includes the network name in the path', () => {
    expect(BASE_DEGENS_URI(NetworkName.Mainnet)).toBe('https://api.niftyleague.com/mainnet/degen/metadata/');
  });

  it('uses sepolia for sepolia network', () => {
    expect(BASE_DEGENS_URI(NetworkName.Sepolia)).toBe('https://api.niftyleague.com/sepolia/degen/metadata/');
  });

  it('uses IMX testnet slug', () => {
    expect(BASE_DEGENS_URI(NetworkName.IMXzkEVMTestnet)).toBe(
      'https://api.niftyleague.com/imtbl-zkevm-testnet/degen/metadata/',
    );
  });

  it('uses IMX mainnet slug', () => {
    expect(BASE_DEGENS_URI(NetworkName.IMXzkEVMMainnet)).toBe(
      'https://api.niftyleague.com/imtbl-zkevm-mainnet/degen/metadata/',
    );
  });
});

describe('BASE_COMICS_URI', () => {
  it('is a template URL with {id} placeholder', () => {
    expect(BASE_COMICS_URI).toContain('{id}');
    expect(BASE_COMICS_URI).toBe('https://api.niftyleague.com/imx/comics/metadata/{id}');
  });
});

describe('IMX_BASE_API', () => {
  it('returns production immutable API for mainnet', () => {
    expect(IMX_BASE_API(NetworkName.Mainnet)).toBe('https://api.immutable.com/v1');
  });

  it('returns production immutable API for IMX mainnet', () => {
    expect(IMX_BASE_API(NetworkName.IMXzkEVMMainnet)).toBe('https://api.immutable.com/v1');
  });

  it('returns sandbox immutable API for sepolia', () => {
    expect(IMX_BASE_API(NetworkName.Sepolia)).toBe('https://api.sandbox.immutable.com/v1');
  });

  it('returns sandbox immutable API for IMX testnet', () => {
    expect(IMX_BASE_API(NetworkName.IMXzkEVMTestnet)).toBe('https://api.sandbox.immutable.com/v1');
  });

  it('returns sandbox immutable API for hardhat', () => {
    expect(IMX_BASE_API(NetworkName.Hardhat)).toBe('https://api.sandbox.immutable.com/v1');
  });
});

describe('gasOverrides', () => {
  it('has maxPriorityFeePerGas set to 11 gwei', () => {
    expect(gasOverrides.maxPriorityFeePerGas).toBe((11e9).toString());
  });

  it('has maxFeePerGas set to 15 gwei', () => {
    expect(gasOverrides.maxFeePerGas).toBe((15e9).toString());
  });

  it('has gasLimit set to 5_000_000', () => {
    expect(gasOverrides.gasLimit).toBe(5_000_000);
  });
});
