import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployMockERC721: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('MockERC721', {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports = deployMockERC721;
deployMockERC721.tags = ['MockERC721'];
