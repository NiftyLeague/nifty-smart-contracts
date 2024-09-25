import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
// import { BRIDGE_PROXY_ADDRESS } from '~/constants/addresses';
import { initNFTLRoles } from '~/scripts/imx/contractRoles';
import { NFTL } from '~/types/typechain';
import { NetworkName } from '~/types';

const TOKEN = { name: 'Nifty League', symbol: 'NFTL' };

type DeploymentArgs = [owner: Address, rootToken: Address, name: string, symbol: string];

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const signer = await hre.ethers.getSigner(deployer);
  const network = hre.network.name as NetworkName;

  // const bridgeAddress = BRIDGE_PROXY_ADDRESS[hre.network.name as NetworkName] as Address;
  const NFTLToken = await hre.companionNetworks['L1'].deployments.get('NFTLToken');
  const args: DeploymentArgs = [deployer, NFTLToken.address, TOKEN.name, TOKEN.symbol];

  const deployResult = await deploy('NFTL', { from: deployer, args, log: true });

  const contract = await hre.ethers.getContract<NFTL>('NFTL', signer);

  if (deployResult.newlyDeployed) {
    // Config contract admin
    await initNFTLRoles(network, contract, deployer);
  }
};

module.exports = deployFunction;
deployFunction.tags = ['NFTL'];
