import { ethers, network } from 'hardhat';
import type { Signer } from 'ethers';
export const forkMainnet = async () => {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: `https://mainnet.gateway.tenderly.co/${process.env.TENDERLY_ACCESS_KEY}`,
        },
      },
    ],
  });
};

export const forkImmutable = async () => {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: `https://rpc.testnet.immutable.com`,
        },
      },
    ],
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

const getSlot = (userAddress: string, mappingSlot: number) => {
  // the slot must be a hex string stripped of leading zeros! no padding!
  return ethers.solidityPackedKeccak256(['uint256', 'uint256'], [userAddress, mappingSlot]);
};

const toBytes32 = (bn: bigint): string => {
  return ethers.hexlify(ethers.zeroPadValue(ethers.toBeHex(bn), 32));
};

/**
 * Modifies the token balance of a user in the storage of a smart contract.
 * @param amount - The amount to modify the token balance by.
 * @param userAddress - The address of the user.
 * @param tokenAddress - The address of the token smart contract.
 * @param mappingSlot - The slot index of the mapping in the storage.
 */
export const modifyTokenBalance = async (
  amount: bigint,
  userAddress: string,
  tokenAddress: string,
  mappingSlot: number,
) => {
  // get storage slot index
  const slot = getSlot(userAddress, mappingSlot);
  // storage value must be a 32 bytes long padded with leading zeros hex string
  const storageValue = toBytes32(amount);

  await ethers.provider.send('hardhat_setStorageAt', [tokenAddress, slot, storageValue]);
  await ethers.provider.send('evm_mine', []); // Just mines to the next block
};
