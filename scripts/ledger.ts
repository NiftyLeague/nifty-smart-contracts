import { ethers } from 'hardhat';
import ethProvider from 'eth-provider';

export const getLedgerSigner = async () => {
  const frame = ethProvider('frame');
  const ledgerSigner = (await frame.request({ method: 'eth_requestAccounts' }))[0];
  const { Web3Provider } = ethers.providers;
  const provider = new Web3Provider(frame);
  return provider.getSigner(ledgerSigner);
};
