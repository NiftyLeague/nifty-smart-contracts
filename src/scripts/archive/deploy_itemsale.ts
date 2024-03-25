// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as dotenv from 'dotenv';
import { config, ethers, network, tenderly, run, upgrades } from 'hardhat';
import chalk from 'chalk';
import fs from 'fs';

import { NetworkName } from '~/types';
import { NFTL_TOKEN_ADDRESS, NIFTY_DAO_SAFE, NIFTY_ITEM_L2_ADDRESS, NIFTY_TEAM_SAFE } from '~/constants/addresses';
import { BURN_PERCENTAGE, DAO_PERCENTAGE, TREASURY_PERCENTAGE } from '~/constants/itemsSale';
import { abiEncodeArgs, tenderlyVerify } from '../utils';
import { getLedgerSigner } from '../ledger';

dotenv.config();

const targetNetwork = network.name as NetworkName;

const deploy = async (contractName: string, _args: unknown[] = [], contractType: number, overrides = {}) => {
  console.log(` 🛰  Deploying: ${contractName} to ${targetNetwork}`);

  const contractArgs = _args || [];
  const useSigner = targetNetwork === 'sepolia' || targetNetwork === 'mainnet';
  const args = useSigner ? { signer: await getLedgerSigner() } : {};
  const contractFactory = await ethers.getContractFactory(contractName, args);

  let deployedContract;
  if (contractType == 0) {
    deployedContract = await contractFactory.deploy(...contractArgs, overrides);
  } else {
    deployedContract = await upgrades.deployProxy(contractFactory, contractArgs, overrides);
  }

  let extraGasInfo = '';
  const deployTransaction = await deployedContract.deploymentTransaction();
  if (deployedContract && deployTransaction) {
    // wait for 5 confirmations for byte data to populate
    await deployTransaction.wait(5);
    const gasUsed = deployTransaction.gasLimit * deployTransaction.gasPrice;
    extraGasInfo = `${ethers.formatEther(gasUsed)} ETH, tx hash ${deployTransaction.hash}`;
  }
  const deployedContractAddress = await deployedContract.getAddress();
  fs.writeFileSync(`${config.paths.artifacts}/${contractName}.address`, deployedContractAddress);

  console.log(' 📄', chalk.cyan(contractName), 'deployed to:', chalk.magenta(deployedContractAddress));
  console.log(' ⛽', chalk.grey(extraGasInfo));

  await tenderly.persistArtifacts({
    name: contractName,
    address: deployedContractAddress,
  });

  await deployedContract.waitForDeployment();

  let encoded;
  if (contractType == 0) {
    encoded = abiEncodeArgs(deployedContract, contractArgs, contractType);
  } else {
    // TODO: verify this still works
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(deployedContractAddress);
    const impl = await ethers.getContractAt(contractName, implementationAddress);
    // const impl = await (await upgrades.admin.getInstance()).getProxyImplementation(deployedContractAddress);
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
  const items = NIFTY_ITEM_L2_ADDRESS[network.name as NetworkName];
  const nftl = NFTL_TOKEN_ADDRESS[network.name as NetworkName];
  const treasury = NIFTY_TEAM_SAFE;
  const dao = NIFTY_DAO_SAFE;
  const burnPercentage = BURN_PERCENTAGE;
  const daoPercentage = DAO_PERCENTAGE;
  const treasuryPercentage = TREASURY_PERCENTAGE;

  const itemSale = await deploy(
    'NiftyItemSale',
    [items, nftl, treasury, dao, burnPercentage, treasuryPercentage, daoPercentage],
    1,
  );
  const itemSaleAddress = await itemSale.getAddress();

  // Verify the contracts
  await tenderlyVerify({
    contractName: 'NiftyItemSale',
    contractAddress: itemSaleAddress,
  });
  console.log(chalk.blue(` 📁 Attempting etherscan verification of ${itemSaleAddress} on ${targetNetwork}`));
  await run('verify:verify', {
    address: itemSaleAddress,
    constructorArguments: [items, nftl, treasury, dao, burnPercentage, treasuryPercentage, daoPercentage],
    contract: 'contracts/NiftyItemSale.sol:NiftyItemSale',
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
