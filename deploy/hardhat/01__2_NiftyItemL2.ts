import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from "hardhat-deploy/types";

const { config: dotenvConfig } = require("dotenv");
const path = require("path");

dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

const NiftyItemL2: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy("NiftyItemL2", {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: "DefaultProxyAdmin",
      execute: {
        init: {
          methodName: "initialize",
          args: [process.env.STARK_CONTRACT_ADDRESS],
        },
      },
    },
  });
};
module.exports = NiftyItemL2;
NiftyItemL2.tags = ["NiftyItemL2"];
