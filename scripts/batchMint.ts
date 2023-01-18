import { config, ethers } from 'hardhat';
import fs from 'fs';
import { Contract } from 'ethers';
// import { getLedgerSigner } from './ledger';

const airdropData: { [address: string]: { [page: string]: number } } = JSON.parse(
  fs.readFileSync('data/mintAirdrop.json', { encoding: 'utf8' }),
);

const getToken = async (contractName: string) => {
  const addressPath = `${config.paths.artifacts}/${contractName}.address`;
  const tokenAddress = fs.readFileSync(addressPath).toString();
  //   const signer = await getLedgerSigner();
  //   const token = await ethers.getContractAt(contractName, tokenAddress, signer);
  const accounts = await ethers.getSigners();
  const token = await ethers.getContractAt(contractName, tokenAddress, accounts[0]);
  await token.deployed();
  return token;
};

const sendTx = async (
  comics: Contract,
  address: string,
  values: {
    [page: string]: number;
  },
  data: Uint8Array,
  nonce?: number,
) => {
  console.log('address', address);
  console.log('values', values);
  const ids = Object.keys(values).map(id => parseInt(id[1], 10));
  const amounts = Object.values(values);
  const overrides = {
    //   nonce,
    maxPriorityFeePerGas: ethers.utils.parseUnits('3', 'gwei'),
    maxFeePerGas: ethers.utils.parseUnits('120', 'gwei'),
  };
  if (ids.length === 1) {
    return comics.mint(address, ids[0], amounts[0], data, overrides);
  } else {
    return comics.mintBatch(address, ids, amounts, data, overrides);
  }
};

async function main() {
  const comics = await getToken('NiftyLaunchComics');
  const data = ethers.utils.toUtf8Bytes('Collect 6 tribes or 6 comics...?');
  const holders = Object.entries(airdropData);
  // let nonce = 542;
  for (const [address, v] of holders) {
    const tx = await sendTx(comics, address, v, data);
    console.log('tx nonce', tx.nonce);
    // nonce += 1;
  }
  // console.log('finished', nonce);
  return null;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
