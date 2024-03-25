import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployMockERC20: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('MockERC20', {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports = deployMockERC20;
deployMockERC20.tags = ['MockERC20'];
