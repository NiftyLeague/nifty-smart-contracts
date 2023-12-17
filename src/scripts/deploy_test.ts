import { ethers, upgrades } from 'hardhat';
import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';

async function main() {
  console.log('TEST DEPLOY SCRIPT');
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const mockERC20 = await MockERC20.deploy();
  await mockERC20.waitForDeployment();
  const BalanceManager = await ethers.getContractFactory('BalanceManager');
  const balanceManager = await upgrades.deployProxy(BalanceManager, [
    await mockERC20.getAddress(),
    NIFTY_LEDGER_DEPLOYER,
  ]);
  await balanceManager.waitForDeployment();
  console.log('BalanceManager deployed to:', await balanceManager.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
