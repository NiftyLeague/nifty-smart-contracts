import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployMockVRFCoordinator: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('MockVRFCoordinator', {
    from: deployer,
    args: [],
    log: true,
  });
};

module.exports = deployMockVRFCoordinator;
deployMockVRFCoordinator.tags = ['MockVRFCoordinator'];
