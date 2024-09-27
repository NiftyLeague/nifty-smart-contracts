import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import MerkleTree from '~/data/merkle-result.json';

const MERKLE_ROOT = MerkleTree.merkleRoot;
const END_TIME = 1767240000; // Jan 1, 2026

type DeploymentArgs = [token: Address, merkleRoot: string, endTime: number];

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const NFTLToken = await hre.deployments.get('NFTL');
  const args: DeploymentArgs = [NFTLToken.address, MERKLE_ROOT, END_TIME];

  await deploy('BalanceManagerDistributor', { from: deployer, args, log: true });
};

module.exports = deployFunction;
deployFunction.tags = ['BalanceManagerDistributor'];
