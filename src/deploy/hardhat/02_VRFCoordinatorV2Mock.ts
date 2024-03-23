import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployVRFCoordinatorV2Mock: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const BASE_FEE = 100;
  const GAS_PRICE_LINK = 100;

  await deploy('VRFCoordinatorV2Mock', {
    from: deployer,
    args: [BASE_FEE, GAS_PRICE_LINK],
    log: true,
  });
};

module.exports = deployVRFCoordinatorV2Mock;
deployVRFCoordinatorV2Mock.tags = ['VRFCoordinatorV2Mock'];
