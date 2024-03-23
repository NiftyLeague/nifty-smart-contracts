import chalk from 'chalk';
import fs from 'fs';
import { config, ethers, network, tenderly } from 'hardhat';

import { tenderlyVerify, etherscanVerify, abiEncodeArgs } from '../utils';
import { getLedgerSigner } from '../ledger';

import { NIFTY_DAO_SAFE, NIFTY_MARKETING, NIFTY_TEAM_SAFE } from '~/constants/addresses';
import { ALLOWED_COLORS } from '~/constants/allowedColors';
import type { BaseContract, Contract, ContractTransactionResponse } from 'ethers';

const targetNetwork = network.name;
const localNetwork = targetNetwork === 'localhost';

const main = async () => {
  console.log(`\n\n 📡 Deploying to ${targetNetwork}...\n`);

  const [storage, newContract] = await getOrCreateContract('AllowedColorsStorage');
  const storageAddress = await storage.getAddress();
  if (newContract) {
    console.log(' 👾 Setting Allowed Colors');
    // eslint-disable-next-line no-restricted-syntax
    for (const [i, traits] of ALLOWED_COLORS.entries()) {
      const args = [i + 1, traits, true];
      // eslint-disable-next-line no-await-in-loop
      await storage.setAllowedColorsOnTribe(...args);
    }
  }

  const emissionStartTimestamp = Math.floor(Date.now() / 1000);
  const nftlToken = await deploy('NFTLToken', [emissionStartTimestamp]);
  const nftlTokenAddress = await nftlToken.getAddress();
  const degen = await deploy('NiftyDegen', [nftlTokenAddress, storageAddress]);
  const degenAddress = await degen.getAddress();
  await nftlToken.setNFTAddress(degenAddress);
  await degen.setBaseURI(`https://api.nifty-league.com/${targetNetwork}/degen/`);
  await degen.initPoolSizes();

  // Timelock team allocation
  const date = new Date();
  const release = date.setMonth(date.getMonth() + 6);
  const releaseDate = Math.floor(release / 1000);
  const timelock = await deploy('NFTLTimelock', [nftlTokenAddress, NIFTY_TEAM_SAFE, releaseDate]);
  const timelockAddress = await timelock.getAddress();
  const teamSupply = ethers.parseEther('100000000');
  await nftlToken.mint(timelockAddress, teamSupply);

  // Mint DAO and marketing token allocations
  const treasurySupply = ethers.parseEther('125000000');
  await nftlToken.mint(NIFTY_DAO_SAFE, treasurySupply);
  const marketingSupply = ethers.parseEther('11400000');
  await nftlToken.mint(NIFTY_MARKETING, marketingSupply);

  // if you want to instantiate a version of these contracts at a specific address
  /*
  const [nftlToken] = await getOrCreateContract('NFTLToken', [
    emissionStartTimestamp,
    ownerSupply,
    treasurySupply,
    NIFTY_DAO_SAFE,
  ]);
  const [degen] = await getOrCreateContract('NiftyDegen', [nftlToken.address, storage.address]);
  */

  // If you want to send ether to an address
  /*
  const deployerWallet = ethers.provider.getSigner();
  const deployerAddress = await deployerWallet.getAddress();
  const nonce = await deployerWallet.getTransactionCount();
  await deployerWallet.sendTransaction({
    to: NIFTY_MARKETING,
    value: ethers.utils.parseEther("1"),
  });
  */

  // If you want to send some ETH to a contract on deploy (make your constructor payable!)
  /*
  const yourContract = await deploy("YourContract", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  if (!localNetwork) {
    // If you want to verify your contract on tenderly.co
    console.log(chalk.blue('verifying on tenderly'));
    await tenderlyVerify({ contractName: 'AllowedColorsStorage', contractAddress: storageAddress });
    await tenderlyVerify({ contractName: 'NFTLToken', contractAddress: nftlTokenAddress });
    await tenderlyVerify({ contractName: 'NiftyDegen', contractAddress: degenAddress });
    await tenderlyVerify({ contractName: 'NFTLTimelock', contractAddress: timelockAddress });

    // If you want to verify your contract on etherscan
    console.log(chalk.blue('verifying on etherscan'));
    await etherscanVerify({ address: storageAddress });
    await etherscanVerify({ address: nftlTokenAddress, constructorArguments: [emissionStartTimestamp] });
    await etherscanVerify({ address: degenAddress, constructorArguments: [nftlTokenAddress, storageAddress] });
    await etherscanVerify({
      address: timelockAddress,
      constructorArguments: [nftlTokenAddress, NIFTY_TEAM_SAFE, releaseDate],
    });
  }

  console.log(
    ' 💾  Artifacts (address, abi, and args) saved to: ',
    chalk.blue(`packages/hardhat/artifacts/${targetNetwork}`),
    '\n\n',
  );
};

interface DeployedContract extends BaseContract, Omit<BaseContract, keyof BaseContract> {
  deploymentTransaction(): ContractTransactionResponse;
}

const deploy = async (
  contractName: string,
  _args: any[] = [],
  overrides: Record<string, unknown> = {},
  libraries: Record<string, string> = {},
): Promise<Contract> => {
  console.log(` 🛰  Deploying: ${contractName} to ${targetNetwork}`);

  const contractArgs = _args || [];
  const useSigner = targetNetwork === 'ropsten' || targetNetwork === 'mainnet';
  const contractFactory = await ethers.getContractFactory(contractName, {
    libraries,
    ...(useSigner && { signer: await getLedgerSigner() }),
  });
  const deployedContract: DeployedContract = await contractFactory.deploy(...contractArgs, overrides);
  const deployedAddress = await deployedContract.getAddress();
  const encoded = abiEncodeArgs(deployedContract, contractArgs);
  fs.writeFileSync(`${config.paths.artifacts}/${contractName}.address`, deployedAddress);
  let extraGasInfo = '';
  const deployTransaction = await deployedContract.deploymentTransaction();
  if (deployedContract && deployTransaction) {
    // wait for 5 confirmations for byte data to populate
    if (!localNetwork) await deployTransaction.wait(5);
    const gasUsed = deployTransaction.gasLimit * deployTransaction.gasPrice;
    extraGasInfo = `${ethers.formatEther(gasUsed)} ETH, tx hash ${deployTransaction.hash}`;
  }

  console.log(' 📄', chalk.cyan(contractName), 'deployed to:', chalk.magenta(deployedAddress));
  console.log(' ⛽', chalk.grey(extraGasInfo));

  await tenderly.persistArtifacts({ name: contractName, address: deployedAddress });

  if (!encoded || encoded.length <= 2) return deployedContract as Contract;
  fs.writeFileSync(`${config.paths.artifacts}/${contractName}.args`, encoded.slice(2));
  return deployedContract as Contract;
};

// ------ utils -------

const getOrCreateContract = async (
  contractName: string,
  args: any[] = [],
  overrides: Record<string, unknown> = {},
  libraries: Record<string, string> = {},
): Promise<[Contract, boolean]> => {
  const contractAddress = `./artifacts/${targetNetwork}/${contractName}.address`;
  if (fs.existsSync(contractAddress) && !localNetwork) {
    console.log(` 📁 ${contractName} on ${targetNetwork} already exists`);
    const contract = await ethers.getContractAt(contractName, fs.readFileSync(contractAddress).toString());
    await contract.deployed();
    return [contract, false];
  }
  const contract = await deploy(contractName, args, overrides, libraries);
  return [contract, true];
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
