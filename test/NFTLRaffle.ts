import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import type { NFTLRaffle, MockERC20 } from '../typechain-types';

describe('NFTLRaffle', function () {
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let nftlRaffle: NFTLRaffle;
  let nftlToken: MockERC20;

  const pendingPeriod = 86400 * 2; // 2 days
  const totalWinnerCount = 5;
  const nftlAmountPerTicket = ethers.utils.parseEther('1000');
  const initialNFTLAmount = nftlAmountPerTicket.mul(100);

  const ZERO_ADDRESS = ethers.constants.AddressZero;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob] = accounts;

    // Deploy MockERC20 contracts
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    nftlToken = await MockERC20.deploy();

    // Deploy NFTLRaffle contract
    const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
    nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
      nftlToken.address,
      pendingPeriod,
      totalWinnerCount,
    ])) as NFTLRaffle;

    // mint NFTL tokens
    await nftlToken.mint(alice.address, initialNFTLAmount);
    await nftlToken.mint(bob.address, initialNFTLAmount);
  });

  describe('Initialize', () => {
    it('Should be able to initialize the contract', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
        nftlToken.address,
        pendingPeriod,
        totalWinnerCount,
      ])) as NFTLRaffle;
    });

    it('Should revert if the NFTL contract address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [ZERO_ADDRESS, pendingPeriod, totalWinnerCount]),
      ).to.be.revertedWith('Zero address');
    });

    it('Should revert if the pendign period is not greater than 1 day', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(upgrades.deployProxy(NFTLRaffle, [nftlToken.address, 86400, totalWinnerCount])).to.be.revertedWith(
        '1 day +',
      );
    });
  });

  describe('Deposit', () => {
    it('Should be able to deposit NFTL tokens', async () => {
      // Alice deposits
      let aliceNFTLBalanceBefore = await nftlToken.balanceOf(alice.address);
      let aliceTicketCountBefore = await nftlRaffle.getTicketCountByUser(alice.address);

      let nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      expect(await nftlToken.balanceOf(alice.address)).equal(aliceNFTLBalanceBefore.sub(nftlAmountToDeposit));
      expect(await nftlRaffle.getTicketCountByUser(alice.address)).gt(aliceTicketCountBefore);
      expect(await nftlRaffle.getTicketCountByUser(alice.address)).to.equal(2); // (0, 1)

      // Bob deposits
      let bobNFTLBalanceBefore = await nftlToken.balanceOf(bob.address);
      let bobTicketCountBefore = await nftlRaffle.getTicketCountByUser(bob.address);

      nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5
      await nftlToken.connect(bob).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit);

      expect(await nftlToken.balanceOf(bob.address)).equal(bobNFTLBalanceBefore.sub(nftlAmountToDeposit));
      expect(await nftlRaffle.getTicketCountByUser(bob.address)).gt(bobTicketCountBefore);
      expect(await nftlRaffle.getTicketCountByUser(bob.address)).to.equal(2); // (2, 3)

      // Alice deposits
      aliceNFTLBalanceBefore = await nftlToken.balanceOf(alice.address);
      aliceTicketCountBefore = await nftlRaffle.getTicketCountByUser(alice.address);

      nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5 + x2.5
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      expect(await nftlToken.balanceOf(alice.address)).equal(aliceNFTLBalanceBefore.sub(nftlAmountToDeposit));
      expect(await nftlRaffle.getTicketCountByUser(alice.address)).gt(aliceTicketCountBefore);
      expect(await nftlRaffle.getTicketCountByUser(alice.address)).to.equal(5); // (0, 1) + (4, 5, 6)

      // Check the user status
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner
      expect(await nftlRaffle.getUserCount()).to.equal(2); // Alice, Bob
      expect(await nftlRaffle.getUserList()).to.deep.equal([alice.address, bob.address]); // Alice, Bob
      expect(await nftlRaffle.getTicketIdsByUser(alice.address)).to.deep.equal([
        BigNumber.from(0),
        BigNumber.from(1),
        BigNumber.from(4),
        BigNumber.from(5),
        BigNumber.from(6),
      ]);
      expect(await nftlRaffle.getTicketIdsByUser(bob.address)).to.deep.equal([BigNumber.from(2), BigNumber.from(3)]);
      expect(await nftlRaffle.totalTicketCount()).to.equal(7);
    });
  });

  describe('pause/unpause', () => {
    it('Pause', async () => {
      expect(await nftlRaffle.paused()).to.be.false;

      // Pause the contract
      await nftlRaffle.pause();

      // check pause status
      expect(await nftlRaffle.paused()).to.be.true;
    });

    it('Unpause', async () => {
      // Pause the contract
      await nftlRaffle.pause();

      // Unpause the contract
      await nftlRaffle.unpause();

      // check pause status
      expect(await nftlRaffle.paused()).to.be.false;
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).pause()).to.be.reverted;
      await expect(nftlRaffle.connect(alice).unpause()).to.be.reverted;
    });
  });
});
