import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { getInterchainTokenRecord, transferTokens } from '~/scripts/imx/interchainTokenService';
import { BRIDGE_ROLE } from '~/scripts/imx/contractRoles';
import { NFTL } from '~/types/typechain';
import { NetworkName } from '~/types';

const TEST_TOKEN_TRANSFER = false;

const deployFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const signer = await hre.ethers.getSigner(deployer);

  const network = hre.network.name as NetworkName;
  const { tokenManagerAddress } = await getInterchainTokenRecord(network);

  if (tokenManagerAddress) {
    const NFTL = await hre.ethers.getContract<NFTL>('NFTL', signer);
    const hasBridgeRole = await NFTL.hasRole(BRIDGE_ROLE, tokenManagerAddress);
    if (!hasBridgeRole) {
      await NFTL.grantRole(BRIDGE_ROLE, tokenManagerAddress);
      console.log('✅ Bridge role granted to InterchainTokenService');
    }

    // TODO: Debug flow transfering tokens back to root network
    if (TEST_TOKEN_TRANSFER) {
      const remoteNetwork = network === NetworkName.IMXzkEVMTestnet ? NetworkName.Sepolia : NetworkName.Mainnet;
      const amount = hre.ethers.parseEther('500');
      await transferTokens(hre, remoteNetwork, amount);
    }
  }
};

module.exports = deployFunction;
deployFunction.tags = ['InterchainTokenService'];
