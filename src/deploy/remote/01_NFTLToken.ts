import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address, DeployFunction } from 'hardhat-deploy/types';
import { NFTL_EMISSION_START } from '~/constants/other';
import { MINT_TARGETS } from '~/constants/addresses';

const mintNFTL = async (hre: HardhatRuntimeEnvironment, from: Address, args: [to: Address, amount: bigint]) => {
  const { execute } = hre.deployments;
  await execute('NFTLToken', { from, log: true }, 'mint', ...args);
};

const deployNFTLToken: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const emissionStartTimestamp = NFTL_EMISSION_START; // Math.floor(Date.now() / 1000);

  const deployResult = await deploy('NFTLToken', {
    from: deployer,
    args: [emissionStartTimestamp],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (deployResult.newlyDeployed) {
    const allocation = hre.ethers.parseEther('100000000');
    for (const address of MINT_TARGETS) {
      await mintNFTL(hre, deployer, [address, allocation]);
    }
  }
};

module.exports = deployNFTLToken;
deployNFTLToken.tags = ['NFTLToken'];
