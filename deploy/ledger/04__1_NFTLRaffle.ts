import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { getLedgerSigner } from '../../scripts/ledger';
import { NFTL_TOKEN_ADDRESS, DEGEN_ADDRESS, VRF_COORDINATOR_ADDRESS } from '../../constants/addresses';
import { NetworkName } from '../../types';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';

dotenvConfig({ path: path.resolve(__dirname, '../.env') });

const deployNFTLRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;

  try {
    const deployer = await getLedgerSigner();

    await deploy('NFTLRaffle', {
      from: await deployer.getAddress(),
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
              DEGEN_ADDRESS[hre.network.name as NetworkName],
              VRF_COORDINATOR_ADDRESS[hre.network.name as NetworkName],
            ],
          },
        },
      },
    });
  } catch (err) {
    console.error('\nFailed in the NFTLRaffle contract deployment using the ledger\n');
    console.error(err);
  }
};
module.exports = deployNFTLRaffle;
deployNFTLRaffle.tags = ['NFTLRaffle'];
