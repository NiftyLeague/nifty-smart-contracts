import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { ALLOWED_COLORS } from '~/constants/allowedColors';

const deployStorage: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy, execute } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const deployResult = await deploy('AllowedColorsStorage', {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (deployResult.newlyDeployed) {
    for (const [i, traits] of ALLOWED_COLORS.entries()) {
      const args = [i + 1, traits, true];
      await execute('AllowedColorsStorage', { from: deployer, log: true }, 'setAllowedColorsOnTribe', ...args);
    }
  }
};

module.exports = deployStorage;
deployStorage.tags = ['AllowedColorsStorage'];
