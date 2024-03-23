import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import type { AllowedColorsStorage, NFTLToken, NiftyDegen } from '~/types/typechain';
import { BASE_DEGENS_URI } from '~/constants/other';
import { NIFTY_ANDY, NIFTY_SPIKE, SNARFY, NIFTY_DAO_SAFE, NIFTY_TEAM_SAFE } from '~/constants/addresses';
import { getCharacterTraits } from '~/scripts/degens';

const mintDegen = async (hre: HardhatRuntimeEnvironment, from: Address, to?: Address) => {
  const degenContract = await hre.ethers.getContract<NiftyDegen>('NiftyDegen');
  const totalSupply = await degenContract.totalSupply();
  const tokenId = totalSupply + 1n;

  const purchaseArgs = getCharacterTraits(tokenId);
  if (!purchaseArgs) throw new Error('Invalid tokenId');

  const { execute } = hre.deployments;
  await execute('NiftyDegen', { from, log: true }, 'purchase', ...purchaseArgs);
  if (to && to !== from)
    await execute('NiftyDegen', { from, log: true }, 'safeTransferFrom(address,address,uint256)', from, to, tokenId);
};

const deployNiftyDegen: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, execute } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const nftlToken = await hre.ethers.getContract<NFTLToken>('NFTLToken');
  const storage = await hre.ethers.getContract<AllowedColorsStorage>('AllowedColorsStorage');

  const deployResult = await deploy('NiftyDegen', {
    from: deployer,
    args: [await nftlToken.getAddress(), await storage.getAddress()],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (deployResult.newlyDeployed) {
    await execute('NFTLToken', { from: deployer, log: true }, 'setNFTAddress', deployResult.address);
    await execute('NiftyDegen', { from: deployer, log: true }, 'setBaseURI', BASE_DEGENS_URI);
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
  }
};

module.exports = deployNiftyDegen;
deployNiftyDegen.tags = ['NiftyDegen'];
