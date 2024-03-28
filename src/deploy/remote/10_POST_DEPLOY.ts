import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { NiftyDegen } from '~/types/typechain';
import { BURN_LIST } from '~/constants/burnList';
import { burnDegen } from '~/scripts/degens';
import { mintDegen } from '~/scripts/mint';

const postDeployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const chainId = await hre.getChainId();
  if (chainId === '1') return console.log('Skipping post deploy on mainnet');

  const { deployer } = await hre.getNamedAccounts();
  const degenContract = await hre.ethers.getContract<NiftyDegen>('NiftyDegen');
  const totalSupply = await degenContract.totalSupply();

  // Mint remaining supply if not finished
  for (let i = totalSupply; i < 10000; i++) {
    await mintDegen(hre, deployer);
  }
  // Burn any testnet DEGENs burnt on mainnet
  for (const tokenId of BURN_LIST) {
    const owner = await degenContract.ownerOf(tokenId);
    if (deployer === owner) await burnDegen(hre, deployer, tokenId);
  }
  // Disperse remaining DEGENs
};

module.exports = postDeployFunction;
postDeployFunction.tags = ['PostDeploy'];
