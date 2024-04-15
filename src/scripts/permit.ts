import type { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import type { ComicsBurner, NiftyMarketplace } from '~/types/typechain';

const splitSig = (sig: string) => {
  // splits the signature to r, s, and v values.
  const pureSig = sig.replace('0x', '');

  return {
    r: Buffer.from(pureSig.substring(0, 64), 'hex'),
    s: Buffer.from(pureSig.substring(64, 128), 'hex'),
    v: Buffer.from(parseInt(pureSig.substring(128, 130), 16).toString()),
  };
};

export async function getPermitSignature(
  signer: Signer,
  token: NiftyMarketplace,
  contract: ComicsBurner,
  deadline: bigint,
) {
  const owner = await signer.getAddress();
  const [nonce, name, verifyingContract, network, spender] = await Promise.all([
    token.nonces(owner),
    token.name(),
    token.getAddress(),
    signer.provider?.getNetwork(),
    contract.getAddress(),
  ]);

  const domain: TypedDataDomain = {
    name,
    version: '1',
    chainId: network?.chainId,
    verifyingContract,
  };
  const types: Record<string, TypedDataField[]> = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'approved', type: 'bool' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };
  const permit: Record<string, any> = { owner, spender, approved: true, nonce, deadline };
  const signature = await signer.signTypedData(domain, types, permit);
  const split = splitSig(signature);

  return { ...split, signature };
}
