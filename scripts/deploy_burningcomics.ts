// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import * as dotenv from 'dotenv';

import { config, ethers, network, tenderly, run, upgrades } from 'hardhat';
import chalk from 'chalk';
import fs from 'fs';
import { BigNumber } from '@ethersproject/bignumber';
import { abiEncodeArgs, getLedgerSigner, tenderlyVerify } from './utils';

dotenv.config();

const targetNetwork = network.name;

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
    await deployedContract.deployTransaction.wait(2);
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
  const comicsAddress = process.env.COMICS_ADDRESS;
  const comicsBurningStartAt = process.env.COMICS_BURNING_STARTAT;

  const uriForNiftyItems = `https://api.nifty-league.com/${targetNetwork}/items/{id}`;
  const items = await deploy('NiftyEquipment', ['Nifty Items', 'NLT', uriForNiftyItems], 0);

  const uriForNiftyKeys = `https://api.nifty-league.com/${targetNetwork}/keys/{id}`;
  const keys = await deploy('NiftyEquipment', ['Nifty Keys', 'NLK', uriForNiftyKeys], 0);

  const burningComics = await deploy(
    'NiftyBurningComics',
    [comicsAddress, keys.address, items.address, comicsBurningStartAt],
    1,
  );

  // Verify the contracts
  await tenderlyVerify({
    contractName: 'NiftyEquipment',
    contractAddress: items.address,
  });
  console.log(chalk.blue(` 📁 Attempting etherscan verification of ${items.address} on ${targetNetwork}`));
  await run('verify:verify', {
    address: items.address,
    constructorArguments: ['Nifty Items', 'NLT', uriForNiftyItems],
    contract: 'contracts/NiftyEquipment.sol:NiftyEquipment',
  });

  // await tenderlyVerify({
  //   contractName: 'NiftyKeys',
  //   contractAddress: keys.address,
  // });
  // console.log(chalk.blue(` 📁 Attempting etherscan verification of ${keys.address} on ${targetNetwork}`));
  // await run('verify:verify', { address: keys.address, constructorArguments: ['Nifty Keys', 'NLK', uriForNiftyKeys], contract: "contracts/NiftyEquipment.sol:NiftyEquipment" });

  const burningComicsImpl = await (await upgrades.admin.getInstance()).getProxyImplementation(burningComics.address);
  await tenderlyVerify({
    contractName: 'NiftyBurningComics',
    contractAddress: burningComicsImpl,
  });
  console.log(chalk.blue(` 📁 Attempting etherscan verification of ${burningComicsImpl} on ${targetNetwork}`));
  await run('verify:verify', {
    address: burningComicsImpl,
    constructorArguments: [],
    contract: 'contracts/NiftyBurningComics.sol:NiftyBurningComics',
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
