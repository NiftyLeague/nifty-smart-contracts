import { expect } from 'chai';
import { type BigNumberish, type Signer } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { Address } from 'hardhat-deploy/types';

import type { BalanceManager, NFTLToken } from '~/types/typechain';

const getSignature = async (
  signer: Signer,
  beneficiary: Address,
  amount: number,
  nonce: BigNumberish,
  expireAt: number,
) => {
  let message = ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'uint256', 'uint256'],
    [beneficiary, amount, nonce, expireAt],
  );
  let signature = await signer.signMessage(ethers.getBytes(message));
  return signature;
};

const getCurrentTime = async () => {
  const blockNumber = await ethers.provider.getBlockNumber();
  return (await ethers.provider.getBlock(blockNumber))?.timestamp;
};

describe('BalanceManager', function () {
  let alice: Signer;
  let balanceManager: BalanceManager;
  let bob: Signer;
  let dao: Signer;
  let deployer: Signer;
  let maintainer: Signer;
  let nftl: NFTLToken;

  const INIT_BALANCE = 10000;
  const DEPOSIT_AMOUNT = 500;
  const WITHDRAW_AMOUNT = 200;
  const ONE_DAY = BigInt(3600 * 24);

  beforeEach(async () => {
    [deployer, maintainer, alice, bob, dao] = (await ethers.getSigners()) as Signer[];

    // Deploy NFTL token
    const NFTL = await ethers.getContractFactory('MockERC20');
    nftl = (await NFTL.deploy()) as unknown as NFTLToken;

    // Deploy BalanceManager
    const BalanceManager = await ethers.getContractFactory('BalanceManager');
    balanceManager = (await upgrades.deployProxy(BalanceManager, [
      await nftl.getAddress(),
      await maintainer.getAddress(),
    ])) as unknown as BalanceManager;

    // Mint NFTL tokens to users
    nftl.mint(await alice.getAddress(), INIT_BALANCE);
    nftl.mint(await bob.getAddress(), INIT_BALANCE);
  });

  describe('deposit', function () {
    it('should be able to deposit NFTL tokens', async () => {
      const aliceAddress = await alice.getAddress();
      const bobAddress = await bob.getAddress();
      expect(await nftl.balanceOf(aliceAddress)).to.equal(INIT_BALANCE);

      // deposit
      await nftl.connect(alice).approve(await balanceManager.getAddress(), DEPOSIT_AMOUNT);
      await balanceManager.connect(alice).deposit(DEPOSIT_AMOUNT);

      expect(await nftl.balanceOf(aliceAddress)).to.equal(INIT_BALANCE - DEPOSIT_AMOUNT);
    });
  });

  describe('withdraw', function () {
    beforeEach(async () => {
      const balanceManagerAddress = await balanceManager.getAddress();
      // deposit
      await nftl.connect(alice).approve(balanceManagerAddress, DEPOSIT_AMOUNT);
      await balanceManager.connect(alice).deposit(DEPOSIT_AMOUNT);

      await nftl.connect(bob).approve(balanceManagerAddress, DEPOSIT_AMOUNT);
      await balanceManager.connect(bob).deposit(DEPOSIT_AMOUNT);
    });

    it('should be able to withdraw NFTL tokens', async () => {
      const aliceAddress = await alice.getAddress();
      // withdraw
      let nonceForAlice = await balanceManager.nonce(aliceAddress);
      let expireAtForAlice = ((await getCurrentTime()) || 0) + Number(ONE_DAY);
      let signatureForAlice = await getSignature(
        maintainer,
        aliceAddress,
        WITHDRAW_AMOUNT,
        nonceForAlice,
        expireAtForAlice,
      );
      await balanceManager.connect(alice).withdraw(WITHDRAW_AMOUNT, nonceForAlice, expireAtForAlice, signatureForAlice);

      expect(await nftl.balanceOf(aliceAddress)).to.equal(INIT_BALANCE - DEPOSIT_AMOUNT + WITHDRAW_AMOUNT);
    });

    it('revert if the nonce is invalid', async () => {
      const aliceAddress = await alice.getAddress();
      // withdraw
      let nonceForAlice = await balanceManager.nonce(aliceAddress);
      let expireAtForAlice = ((await getCurrentTime()) || 0) + Number(ONE_DAY);
      let signatureForAlice = await getSignature(
        maintainer,
        aliceAddress,
        WITHDRAW_AMOUNT,
        nonceForAlice + 1n,
        expireAtForAlice,
      );

      await expect(
        balanceManager
          .connect(alice)
          .withdraw(WITHDRAW_AMOUNT, nonceForAlice + 1n, expireAtForAlice, signatureForAlice),
      ).to.be.revertedWith('mismatched nonce');
    });

    it('revert if the request was expired', async () => {
      const aliceAddress = await alice.getAddress();
      // withdraw
      let nonceForAlice = await balanceManager.nonce(aliceAddress);
      let expireAtForAlice = ((await getCurrentTime()) || 0) - Number(ONE_DAY);
      let signatureForAlice = await getSignature(
        maintainer,
        aliceAddress,
        WITHDRAW_AMOUNT,
        nonceForAlice,
        expireAtForAlice,
      );

      await expect(
        balanceManager.connect(alice).withdraw(WITHDRAW_AMOUNT, nonceForAlice, expireAtForAlice, signatureForAlice),
      ).to.be.revertedWith('expired withdrawal request');
    });

    it('revert if the signature is used twice', async () => {
      const aliceAddress = await alice.getAddress();
      // withdraw
      let nonceForAlice = await balanceManager.nonce(aliceAddress);
      let expireAtForAlice = ((await getCurrentTime()) || 0) + Number(ONE_DAY);
      let signatureForAlice = await getSignature(
        maintainer,
        aliceAddress,
        WITHDRAW_AMOUNT,
        nonceForAlice,
        expireAtForAlice,
      );
      await balanceManager.connect(alice).withdraw(WITHDRAW_AMOUNT, nonceForAlice, expireAtForAlice, signatureForAlice);

      // witdraw again with the same signature
      await expect(
        balanceManager
          .connect(alice)
          .withdraw(WITHDRAW_AMOUNT, nonceForAlice + 1n, expireAtForAlice, signatureForAlice),
      ).to.be.revertedWith('used signature');
    });

    it('revert if the amount is wrong', async () => {
      const aliceAddress = await alice.getAddress();
      // withdraw
      let nonceForAlice = await balanceManager.nonce(aliceAddress);
      let expireAtForAlice = ((await getCurrentTime()) || 0) + Number(ONE_DAY);
      let signatureForAlice = await getSignature(
        maintainer,
        aliceAddress,
        WITHDRAW_AMOUNT,
        nonceForAlice,
        expireAtForAlice,
      );

      await expect(
        balanceManager.connect(bob).withdraw(WITHDRAW_AMOUNT, nonceForAlice, expireAtForAlice, signatureForAlice),
      ).to.be.revertedWith('wrong signer');
    });

    it('revert if the amount is wrong', async () => {
      const aliceAddress = await alice.getAddress();
      // withdraw
      let nonceForAlice = await balanceManager.nonce(aliceAddress);
      let expireAtForAlice = ((await getCurrentTime()) || 0) + Number(ONE_DAY);
      let signatureForAlice = await getSignature(
        maintainer,
        aliceAddress,
        WITHDRAW_AMOUNT,
        nonceForAlice,
        expireAtForAlice,
      );

      await expect(
        balanceManager.connect(alice).withdraw(WITHDRAW_AMOUNT + 1, nonceForAlice, expireAtForAlice, signatureForAlice),
      ).to.be.revertedWith('wrong signer');
    });
  });

  describe('updateMaintainer', function () {
    it('should be able to update the maintainer address', async () => {
      const deployerAddress = await deployer.getAddress();
      expect(await balanceManager.maintainer()).to.equal(await maintainer.getAddress());

      // update maintainer address
      await balanceManager.updateMaintainer(deployerAddress);

      expect(await balanceManager.maintainer()).to.equal(deployerAddress);
    });

    it('revert if msg.sender is not a owner', async () => {
      // update maintainer address
      await expect(balanceManager.connect(alice).updateMaintainer(await deployer.getAddress())).to.be.reverted;
    });
  });

  describe('withdrawByDAO', function () {
    beforeEach(async () => {
      const balanceManagerAddress = await balanceManager.getAddress();
      // deposit
      await nftl.connect(alice).approve(balanceManagerAddress, DEPOSIT_AMOUNT);
      await balanceManager.connect(alice).deposit(DEPOSIT_AMOUNT);

      await nftl.connect(bob).approve(balanceManagerAddress, DEPOSIT_AMOUNT);
      await balanceManager.connect(bob).deposit(DEPOSIT_AMOUNT);
    });

    it('should be able to withdraw NFTL tokens', async () => {
      const balanceManagerAddress = await balanceManager.getAddress();
      const daoAddress = await dao.getAddress();

      expect(await nftl.balanceOf(balanceManagerAddress)).to.equal(2 * DEPOSIT_AMOUNT);
      expect(await nftl.balanceOf(daoAddress)).to.equal(0);

      // withdraw NFTL
      await balanceManager.withdrawByDAO(daoAddress, WITHDRAW_AMOUNT);

      expect(await nftl.balanceOf(balanceManagerAddress)).to.equal(2 * DEPOSIT_AMOUNT - WITHDRAW_AMOUNT);
      expect(await nftl.balanceOf(daoAddress)).to.equal(WITHDRAW_AMOUNT);
    });

    it('revert if msg.sender is not a owner', async () => {
      // update maintainer address
      await expect(balanceManager.connect(alice).withdrawByDAO(await dao.getAddress(), WITHDRAW_AMOUNT)).to.be.reverted;
    });
  });
});
