import { ethers, network, tenderly } from 'hardhat';
import { ExternalProvider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Address } from 'hardhat-deploy/types';
import ethProvider from 'eth-provider';
import chalk from 'chalk';
import R from 'ramda';

const targetNetwork = network.name;

// If you want to verify on https://tenderly.co/
// eslint-disable-next-line consistent-return
export const tenderlyVerify = async ({
  contractName,
  contractAddress,
}: {
  contractName: string;
  contractAddress: string;
}) => {
  const tenderlyNetworks = ['kovan', 'goerli', 'mainnet', 'rinkeby', 'ropsten', 'matic', 'mumbai', 'xDai', 'POA'];

  if (tenderlyNetworks.includes(targetNetwork)) {
    console.log(chalk.blue(` 📁 Attempting tenderly verification of ${contractName} on ${targetNetwork}`));
    await tenderly.persistArtifacts({
      name: contractName,
      address: contractAddress,
    });
    const verification = await tenderly.verify({
      name: contractName,
      address: contractAddress,
      network: targetNetwork,
    });
    return verification;
  }
  console.log(chalk.grey(` 🧐 Contract verification not supported on ${targetNetwork}`));
};

// abi encodes contract arguments
// useful when you want to manually verify the contracts
// for example, on Etherscan
export const abiEncodeArgs = (deployed: Contract, contractArgs: unknown[], contractType = 0) => {
  // not writing abi encoded args if this does not pass
  if (!contractArgs || !deployed || !R.hasPath(['interface', 'deploy'], deployed)) {
    return '';
  }
  let encoded;
  if (contractType == 0) {
    encoded = ethers.utils.defaultAbiCoder.encode(deployed.interface.deploy.inputs, contractArgs);
  } else {
    encoded = ethers.utils.defaultAbiCoder.encode(deployed.interface.functions['initialize'].inputs, contractArgs);
  }
  return encoded;
};

// Sign transactions with a Ledger using Frame
// download wallet at https://frame.sh/
export const getLedgerSigner = async () => {
  const frame = ethProvider('frame');
  const ledgerSigner: Address = ((await frame.request({ method: 'eth_requestAccounts' })) as Address[])[0];
  const { Web3Provider } = ethers.providers;
  const provider = new Web3Provider(frame as unknown as ExternalProvider);
  return provider.getSigner(ledgerSigner);
};
