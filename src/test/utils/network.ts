import { ethers, network } from 'hardhat';
import type { Signer } from 'ethers';

export const resetLocalNetwork = async () => {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });
};

export const impersonate = async (addr: string, fund = true): Promise<Signer> => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [addr],
  });

  if (fund) {
    // Give the account 10 Ether
    await network.provider.request({
      method: 'hardhat_setBalance',
      params: [addr, '0x8AC7230489E80000'],
    });
  }

  return ethers.provider.getSigner(addr);
};
