import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction, Address } from 'hardhat-deploy/types';
import { BASE_COMICS_URI } from '~/constants/other';
import { MINT_TARGETS } from '~/constants/addresses';

const batchMintComics = async (
  hre: HardhatRuntimeEnvironment,
  from: Address,
  args: [to: Address, ids: number[], amounts: bigint[], data: Uint8Array],
) => {
  const { execute } = hre.deployments;
  await execute('NiftyLaunchComics', { from, log: true }, 'mintBatch', ...args);
};

const deployNiftyLaunchComics: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const deployResult = await deploy('NiftyLaunchComics', {
    from: deployer,
    args: [BASE_COMICS_URI],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (deployResult.newlyDeployed) {
    const ids = [1, 2, 3, 4, 5, 6];
    const amounts = Array(6).fill(25);
    const data = hre.ethers.toUtf8Bytes('Collect 6 tribes or 6 comics...?');

    for (const address of MINT_TARGETS) {
      await batchMintComics(hre, deployer, [address, ids, amounts, data]);
    }
  }
};

module.exports = deployNiftyLaunchComics;
deployNiftyLaunchComics.tags = ['NiftyLaunchComics'];
