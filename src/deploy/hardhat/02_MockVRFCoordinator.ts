import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployMockVRFCoordinator: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const BASE_FEE = 100;
  const GAS_PRICE_LINK = 100;

  await deploy('MockVRFCoordinator', {
    from: deployer,
    args: [BASE_FEE, GAS_PRICE_LINK],
    log: true,
  });
};

module.exports = deployMockVRFCoordinator;
deployMockVRFCoordinator.tags = ['MockVRFCoordinator'];
