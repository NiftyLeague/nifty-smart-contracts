import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { NFTL_TOKEN_ADDRESS, VRF_COORDINATOR_ADDRESS } from '../../constants/addresses';
import { NetworkName } from '../../types';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

dotenvConfig({ path: path.resolve(__dirname, '../.env') });

const deployNFTLRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('NFTLRaffle', {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            NFTL_TOKEN_ADDRESS[hre.network.name as NetworkName],
            process.env.PENDING_PERIOD,
            process.env.TOTAL_WINNER_TICKET_COUNT,
            VRF_COORDINATOR_ADDRESS[hre.network.name as NetworkName],
          ],
        },
      },
    },
  });
};
module.exports = deployNFTLRaffle;
deployNFTLRaffle.tags = ['NFTLRaffle'];
