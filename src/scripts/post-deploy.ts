import type { NetworkName, PostDeployFunction } from '~/types';
import { MINT_TARGETS, NIFTY_ANDY, NIFTY_DAO_SAFE, NIFTY_SPIKE, NIFTY_TEAM_SAFE, SNARFY } from '~/constants/addresses';
import { ALLOWED_COLORS } from '~/constants/allowedColors';
import { BASE_DEGENS_URI } from '~/constants/other';
import { batchMintComics, mintDegen, mintNFTL } from '~/scripts/mint';

export const initNFTLToken: PostDeployFunction = async (hre, deployer) => {
  const allocation = hre.ethers.parseEther('100000000');
  for (const address of MINT_TARGETS) {
    await mintNFTL(hre, deployer, [address, allocation]);
  }
};

export const initColorsStorage: PostDeployFunction = async (hre, deployer) => {
  const { execute } = hre.deployments;
  for (const [i, traits] of ALLOWED_COLORS.entries()) {
    const args = [i + 1, traits, true];
    await execute('AllowedColorsStorage', { from: deployer, log: true }, 'setAllowedColorsOnTribe', ...args);
  }
};

export const initNiftyDegen: PostDeployFunction = async (hre, deployer) => {
  const { execute, get } = hre.deployments;
  const network = hre.network.name as NetworkName;
  const NiftyDegen = await get('NiftyDegen');
  await execute('NFTLToken', { from: deployer, log: true }, 'setNFTAddress', NiftyDegen.address);
  await execute('NiftyDegen', { from: deployer, log: true }, 'setBaseURI', BASE_DEGENS_URI(network));
  await execute('NiftyDegen', { from: deployer, log: true }, 'initPoolSizes');

  await mintDegen(hre, deployer, NIFTY_ANDY);
  await mintDegen(hre, deployer, SNARFY);
  await mintDegen(hre, deployer, NIFTY_SPIKE);
  await mintDegen(hre, deployer, NIFTY_DAO_SAFE);
  await mintDegen(hre, deployer, NIFTY_TEAM_SAFE);

  await mintDegen(hre, deployer);
  await mintDegen(hre, deployer);
  await mintDegen(hre, deployer);
  await mintDegen(hre, deployer);
  await mintDegen(hre, deployer);
};

export const initNiftyLaunchComics: PostDeployFunction = async (hre, deployer) => {
  const ids = [1, 2, 3, 4, 5, 6];
  const amounts = Array(6).fill(25);
  const data = hre.ethers.toUtf8Bytes('Collect 6 tribes or 6 comics...?');

  for (const address of MINT_TARGETS) {
    await batchMintComics(hre, deployer, [address, ids, amounts, data]);
  }
};
