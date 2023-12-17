import { ethers } from 'hardhat';
import { Address } from 'hardhat-deploy/types';
import ethProvider from 'eth-provider';

// Sign transactions with a Ledger using Frame
// download wallet at https://frame.sh/
export const getLedgerSigner = async () => {
  const frame = ethProvider('frame');
  const ledgerSigner: Address = ((await frame.request({ method: 'eth_requestAccounts' })) as Address[])[0];
  const provider = new ethers.BrowserProvider(frame);
  return provider.getSigner(ledgerSigner);
};
