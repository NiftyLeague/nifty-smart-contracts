// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as dotenv from 'dotenv';

import { config, ethers, network, tenderly, run, upgrades } from 'hardhat';
import chalk from 'chalk';
import fs from 'fs';
import R, { over } from 'ramda';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { getLedgerSigner } from './ledger';

dotenv.config();

const targetNetwork = network.name;

// If you want to verify on https://tenderly.co/
// eslint-disable-next-line consistent-return
const tenderlyVerify = async ({ contractName, contractAddress }: { contractName: string; contractAddress: string }) => {
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
const abiEncodeArgs = (deployed: Contract, contractArgs: unknown[], contractType: number) => {
  // not writing abi encoded args if this does not pass
  if (!contractArgs || !deployed || !R.hasPath(['interface', 'deploy'], deployed)) {
    return '';
  }
  let encoded;
  if (contractType == 0) {
    encoded = ethers.utils.defaultAbiCoder.encode(deployed.interface.deploy.inputs, contractArgs);
  } else {
    encoded = ethers.utils.defaultAbiCoder.encode(deployed.interface.functions["initialize"].inputs, contractArgs);
  }
  return encoded;
};

const deploy = async (contractName: string, _args: unknown[] = [], contractType: number, overrides = {}) => {
  console.log(` 🛰  Deploying: ${contractName} to ${targetNetwork}`);

  const contractArgs = _args || [];
  const useSigner = targetNetwork === 'ropsten' || targetNetwork === 'mainnet';
  const args = useSigner ? { signer: await getLedgerSigner() } : {};
  const contractFactory = await ethers.getContractFactory(contractName, args);

  let deployedContract;
  if (contractType == 0) {
    deployedContract = await contractFactory.deploy(...contractArgs, overrides);
  } else {
    deployedContract = await upgrades.deployProxy(contractFactory, contractArgs, overrides);
  }

  let extraGasInfo = '';
  if (deployedContract && deployedContract.deployTransaction) {
    // wait for 5 confirmations for byte data to populate
    await deployedContract.deployTransaction.wait(5);
    const gasUsed = deployedContract.deployTransaction.gasLimit.mul(
      deployedContract.deployTransaction.gasPrice as BigNumber,
      );
      extraGasInfo = `${ethers.utils.formatEther(gasUsed)} ETH, tx hash ${deployedContract.deployTransaction.hash}`;
  }
  fs.writeFileSync(`${config.paths.artifacts}/${contractName}.address`, deployedContract.address);

  console.log(' 📄', chalk.cyan(contractName), 'deployed to:', chalk.magenta(deployedContract.address));
  console.log(' ⛽', chalk.grey(extraGasInfo));

  await tenderly.persistArtifacts({
    name: contractName,
    address: deployedContract.address,
  });

  await deployedContract.deployed();

  let encoded;
  if (contractType == 0) {
    encoded = abiEncodeArgs(deployedContract, contractArgs, contractType);
  } else {
    const impl = await (await upgrades.admin.getInstance()).getProxyImplementation(deployedContract.address);
    encoded = abiEncodeArgs(impl, contractArgs, contractType);
  }

  if (!encoded || encoded.length <= 2) return deployedContract;
  fs.writeFileSync(`${config.paths.artifacts}/${contractName}.args`, encoded.slice(2));
  return deployedContract;
};

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const items = process.env.NIFTY_ITEMS_ADDRESS;
  const nftl = process.env.NFTL_TOKEN_ADDRESS;
  const treasury = process.env.TREASURY_ADDRESS;
  const dao = process.env.DAO_ADDRESS;
  const burnPercentage = process.env.BURN_PERCENTAGE;
  const daoPercentage = process.env.DAO_PERCENTAGE;
  const treasuryPercentage = process.env.TREASURY_PERCENTAGE;

  const itemSale = await deploy('NiftyItemSale', [items, nftl, treasury, dao, burnPercentage, treasuryPercentage, daoPercentage], 1);

  // Verify the contracts
  await tenderlyVerify({
    contractName: 'NiftyItemSale',
    contractAddress: itemSale.address,
  });
  console.log(chalk.blue(` 📁 Attempting etherscan verification of ${itemSale.address} on ${targetNetwork}`));
  await run('verify:verify', { address: itemSale.address, constructorArguments: [items, nftl, treasury, dao, burnPercentage, treasuryPercentage, daoPercentage], contract: "contracts/NiftyItemSale.sol:NiftyItemSale" });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
