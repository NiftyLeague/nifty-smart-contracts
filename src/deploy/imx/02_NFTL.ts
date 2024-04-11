import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import { BRIDGE_PROXY_ADDRESS } from '~/constants/addresses';
import { NetworkName } from '~/types';

const TOKEN = { name: 'Nifty League', symbol: 'NFTL' };

type DeploymentArgs = [bridge: Address, rootToken: Address, name: string, symbol: string];

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const bridgeAddress = BRIDGE_PROXY_ADDRESS[hre.network.name as NetworkName] as Address;
  const NFTLToken = await hre.companionNetworks['L1'].deployments.get('NFTLToken');
  const args: DeploymentArgs = [bridgeAddress, NFTLToken.address, TOKEN.name, TOKEN.symbol];

  await deploy('NFTL', { from: deployer, args, log: true });
};

module.exports = deployFunction;
deployFunction.tags = ['NFTL'];
