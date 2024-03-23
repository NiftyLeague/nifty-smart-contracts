import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployMockERC1155: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('MockERC1155', {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports = deployMockERC1155;
deployMockERC1155.tags = ['MockERC1155'];
