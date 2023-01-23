const deployMockERC20 = async hre => {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  await deploy('MockERC20', {
    from: deployer,
    args: [],
    log: true,
  });
};
module.exports = deployMockERC20;
deployMockERC20.tags = ['MockERC20'];
