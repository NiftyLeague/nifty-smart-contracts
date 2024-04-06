import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { PENDING_PERIOD, TOTAL_WINNER_TICKET_COUNT } from '~/constants/other';

const deployNFTLRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // get contracts
  const MockERC721 = await hre.deployments.get('MockERC721');
  const MockVRFCoordinator = await hre.deployments.get('MockVRFCoordinator');

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
            MockERC721.address,
            PENDING_PERIOD,
            TOTAL_WINNER_TICKET_COUNT,
            MockERC721.address,
            MockVRFCoordinator.address,
          ],
        },
      },
    },
  });
};

module.exports = deployNFTLRaffle;
deployNFTLRaffle.tags = ['NFTLRaffle'];
