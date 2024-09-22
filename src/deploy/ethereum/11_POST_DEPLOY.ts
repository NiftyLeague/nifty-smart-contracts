import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { NiftyDegen } from '~/types/typechain';
import { BURN_LIST } from '~/constants/burnList';
import { burnDegen } from '~/scripts/degens';
import { mintDegen } from '~/scripts/mint';
import { BURN_ADDY1, BURN_ADDY2 } from '~/constants/addresses';

const postDeployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const degenContract = await hre.ethers.getContract<NiftyDegen>('NiftyDegen');
  const totalSupply = await degenContract.totalSupply();

  // Mint remaining supply if not finished
  for (let i = totalSupply; i < 10000; i++) {
    await mintDegen(hre, deployer);
  }
  console.log('\n✅ Minted remaining DEGENs');
  // Burn any testnet DEGENs burnt on mainnet
  const burnBalance = (await degenContract.balanceOf(BURN_ADDY1)) + (await degenContract.balanceOf(BURN_ADDY2));
  if (burnBalance < 800) {
    for (const tokenId of BURN_LIST) {
      const owner = await degenContract.ownerOf(tokenId);
      if (deployer === owner) await burnDegen(hre, deployer, tokenId);
    }
  }
  console.log('✅ Burnt testnet DEGENs');
  // Disperse remaining DEGENs
  console.log(`\nDEGENs total supply: ${totalSupply.toLocaleString()} | burn balance: ${burnBalance.toString()}\n`);
};

module.exports = postDeployFunction;
postDeployFunction.tags = ['PostDeploy'];
postDeployFunction.skip = async (hre: HardhatRuntimeEnvironment) => {
  const chainId = await hre.getChainId();
  if (chainId === '1') {
    console.log(`Skipping post deploy on ${hre.network.name}`);
    return true;
  }
  return false;
};
