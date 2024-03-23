import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { VRF_COORDINATOR_ADDRESS } from '~/constants/addresses';
import { PENDING_PERIOD, TOTAL_WINNER_TICKET_COUNT } from '~/constants/other';
import { NetworkName } from '~/types';

const deployNFTLRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const nftlToken = await hre.ethers.getContract('NFTLToken');
  const degenContract = await hre.ethers.getContract('NiftyDegen');

  await deploy('NFTLRaffle', {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      proxyContract: 'OpenZeppelinTransparentProxy',
      viaAdminContract: 'DefaultProxyAdmin',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            await nftlToken.getAddress(),
            PENDING_PERIOD,
            TOTAL_WINNER_TICKET_COUNT,
            await degenContract.getAddress(),
            VRF_COORDINATOR_ADDRESS[hre.network.name as NetworkName],
          ],
        },
      },
    },
  });
};

module.exports = deployNFTLRaffle;
deployNFTLRaffle.tags = ['NFTLRaffle'];
