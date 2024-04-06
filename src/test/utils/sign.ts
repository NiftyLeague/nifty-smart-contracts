import type { BigNumberish, Signer } from 'ethers';
import type { Address } from 'hardhat-deploy/types';
import { ethers } from 'hardhat';

export const getSignature = async (
  signer: Signer,
  beneficiary: Address,
  amount: number,
  nonce: BigNumberish,
  expireAt: number,
) => {
  let message = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'uint256'],
    [beneficiary, amount, nonce, expireAt],
  );
  let signature = await signer.signMessage(ethers.getBytes(message));
  return signature;
};
