import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { deployRootTokenManager, deployRemoteTokenManager, transferTokens } from '~/scripts/imx/interchainTokenService';
import { NetworkName } from '~/types';

const TEST_TOKEN_TRANSFER = false;

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const NFTLToken = await hre.deployments.get('NFTLToken');
  const { salt } = await deployRootTokenManager(hre, NFTLToken.address);

  if (salt) {
    const network = hre.network.name as NetworkName;
    const remoteNetwork = network === NetworkName.Sepolia ? NetworkName.IMXzkEVMTestnet : NetworkName.IMXzkEVMMainnet;
    const imxNFTLToken = await hre.companionNetworks['L2'].deployments.get('NFTL');
    await deployRemoteTokenManager(hre, remoteNetwork, imxNFTLToken.address, salt);

    if (TEST_TOKEN_TRANSFER) {
      const amount = hre.ethers.parseEther('1000');
      await transferTokens(hre, remoteNetwork, amount);
    }
  }
};

module.exports = deployFunction;
deployFunction.tags = ['InterchainTokenService'];
