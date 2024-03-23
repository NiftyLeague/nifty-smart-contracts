import { ethers, network, run, tenderly } from 'hardhat';
import { type BaseContract } from 'ethers';
import chalk from 'chalk';
import R from 'ramda';
import { NetworkName } from '~/types';

const targetNetwork = network.name as NetworkName;

// If you want to verify on https://tenderly.co/
// eslint-disable-next-line consistent-return
export const tenderlyVerify = async ({
  contractName,
  contractAddress,
}: {
  contractName: string;
  contractAddress: string;
}) => {
  const tenderlyNetworks = ['sepolia', 'mainnet', 'matic', 'mumbai', 'xDai', 'POA'];

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

// If you want to verify on https://etherscan.io/
export const etherscanVerify = async ({
  address,
  constructorArguments = [],
}: {
  address: string;
  constructorArguments?: any[];
}) => {
  try {
    console.log(chalk.blue(` 📁 Attempting etherscan verification of ${address} on ${targetNetwork}`));
    return await run('verify:verify', { address, constructorArguments });
  } catch (e) {
    return e;
  }
};

// abi encodes contract arguments
// useful when you want to manually verify the contracts
// for example, on Etherscan
export const abiEncodeArgs = (deployed: BaseContract, contractArgs: unknown[], contractType = 0) => {
  // not writing abi encoded args if this does not pass
  if (!contractArgs || !deployed || !R.hasPath(['interface', 'deploy'], deployed)) {
    return '';
  }
  let encoded;
  if (contractType == 0) {
    encoded = ethers.AbiCoder.defaultAbiCoder().encode(deployed.interface.deploy.inputs, contractArgs);
  } else {
    const init = deployed.interface.getFunction('initialize');
    if (init) encoded = ethers.AbiCoder.defaultAbiCoder().encode(init.inputs, contractArgs);
  }
  return encoded;
};

// checks if it is a Solidity file
export const isSolidity = (fileName: string) =>
  fileName.indexOf('.sol') >= 0 && fileName.indexOf('.swp') < 0 && fileName.indexOf('.swap') < 0;

/**
 * Pauses the execution for the specified number of milliseconds.
 * @param ms - The number of milliseconds to sleep.
 * @returns A Promise that resolves after the specified number of milliseconds.
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
