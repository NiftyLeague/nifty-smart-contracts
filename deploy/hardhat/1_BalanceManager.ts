const { config: dotenvConfig } = require("dotenv");
const path = require("path");

dotenvConfig({ path: path.resolve(__dirname, "../.env") });

const deployBalanceManager = async (hre) => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // get contracts
  const MockERC20 = await hre.deployments.get("MockERC20");

  await deploy("BalanceManager", {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: "DefaultProxyAdmin",
      execute: {
        init: {
          methodName: "initialize",
          args: [MockERC20.address, process.env.MAINTAINER_ADDRESS],
        },
      },
    },
  });
};
module.exports = deployBalanceManager;
deployBalanceManager.tags = ["BalanceManager"];
