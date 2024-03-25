import type { NiftyDegen, AllowedColorsStorage, NFTLToken, NiftyLaunchComics } from '~/types/typechain';
import type { NetworkName, DeployFunctionExt } from '~/types';

import { BASE_COMICS_URI, NFTL_EMISSION_START, PENDING_PERIOD, TOTAL_WINNER_TICKET_COUNT } from '~/constants/other';
import {
  BALANCE_MANAGER_MAINTAINER,
  NIFTY_DAO_LEDGER,
  STARK_CONTRACT_ADDRESS,
  VRF_COORDINATOR_ADDRESS,
} from '~/constants/addresses';

export const deployNFTLToken: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;
  const emissionStartTimestamp = NFTL_EMISSION_START; // Math.floor(Date.now() / 1000);

  return await deploy('NFTLToken', {
    from: deployer,
    args: [emissionStartTimestamp],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export const deployColorsStorage: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;

  return await deploy('AllowedColorsStorage', {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export const deployNiftyDegen: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;
  const nftlToken = await hre.ethers.getContract<NFTLToken>('NFTLToken');
  const storage = await hre.ethers.getContract<AllowedColorsStorage>('AllowedColorsStorage');

  return await deploy('NiftyDegen', {
    from: deployer,
    args: [await nftlToken.getAddress(), await storage.getAddress()],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export const deployNiftyLaunchComics: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;

  return await deploy('NiftyLaunchComics', {
    from: deployer,
    args: [BASE_COMICS_URI],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export const deployBalanceManager: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;
  const nftlToken = await hre.ethers.getContract<NFTLToken>('NFTLToken');

  return await deploy('BalanceManager', {
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
          args: [await nftlToken.getAddress(), BALANCE_MANAGER_MAINTAINER],
        },
      },
    },
  });
};

export const deployHydraDistributor: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;
  const degenContract = await hre.ethers.getContract<NiftyDegen>('NiftyDegen');

  return await deploy('HydraDistributor', {
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
          args: [await degenContract.getAddress(), NIFTY_DAO_LEDGER],
        },
      },
    },
  });
};

export const deployNFTLRaffle: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;
  const nftlToken = await hre.ethers.getContract<NFTLToken>('NFTLToken');
  const degenContract = await hre.ethers.getContract<NiftyDegen>('NiftyDegen');

  return await deploy('NFTLRaffle', {
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

export const deployNiftyBurningComicsL2: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;
  const comicsContract = await hre.ethers.getContract<NiftyLaunchComics>('NiftyLaunchComics');

  return await deploy('NiftyBurningComicsL2', {
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
          args: [await comicsContract.getAddress()],
        },
      },
    },
  });
};

export const deployNiftyItemL2: DeployFunctionExt = async (hre, deployer) => {
  const { deploy } = hre.deployments;

  return await deploy('NiftyItemL2', {
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
          args: [STARK_CONTRACT_ADDRESS[hre.network.name as NetworkName]],
        },
      },
    },
  });
};
