import { expect } from 'chai';
import { ethers, upgrades, network } from 'hardhat';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import type { NFTLRaffle, MockERC20, VRFCoordinatorV2Mock } from '../typechain-types';

const getCurrentBlockTimestamp = async (): Promise<BigNumber> => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return BigNumber.from(block.timestamp);
};

const increaseTime = async (sec: number): Promise<void> => {
  await network.provider.send('evm_increaseTime', [sec]);
  await network.provider.send('evm_mine');
};

describe('NFTLRaffle', function () {
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let john: SignerWithAddress;
  let nftlRaffle: NFTLRaffle;
  let nftlToken: MockERC20;
  let vrfCoordinator: VRFCoordinatorV2Mock;

  const pendingPeriod = 86400 * 2; // 2 days
  const totalWinnerTicketCount = 5;
  const nftlAmountPerTicket = ethers.utils.parseEther('1000');
  const initialNFTLAmount = nftlAmountPerTicket.mul(100);

  const ZERO_ADDRESS = ethers.constants.AddressZero;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, john] = accounts;

    // Deploy MockERC20 contract
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    nftlToken = await MockERC20.deploy();

    // Deploy VRFCoordinatorV2Mock contract
    const VRFCoordinator = await ethers.getContractFactory('VRFCoordinatorV2Mock');
    vrfCoordinator = await VRFCoordinator.deploy(ethers.utils.parseEther('0.1'), 1e9);

    // Deploy NFTLRaffle contract
    const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
    nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
      nftlToken.address,
      pendingPeriod,
      totalWinnerTicketCount,
      vrfCoordinator.address,
    ])) as NFTLRaffle;

    // mint NFTL tokens
    await nftlToken.mint(alice.address, initialNFTLAmount);
    await nftlToken.mint(bob.address, initialNFTLAmount);
    await nftlToken.mint(john.address, initialNFTLAmount);
  });

  describe('Initialize', () => {
    it('Should be able to initialize the contract', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
        nftlToken.address,
        pendingPeriod,
        totalWinnerTicketCount,
        vrfCoordinator.address,
      ])) as NFTLRaffle;
    });

    it('Should revert if the NFTL contract address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [ZERO_ADDRESS, pendingPeriod, totalWinnerTicketCount, vrfCoordinator.address]),
      ).to.be.revertedWith('Zero address');
    });

    it('Should revert if the pendign period is not greater than 1 day', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [nftlToken.address, 86400, totalWinnerTicketCount, vrfCoordinator.address]),
      ).to.be.revertedWith('1 day +');
    });

    it('Should revert if the totalWinnerTicketCount is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [nftlToken.address, pendingPeriod, 0, vrfCoordinator.address]),
      ).to.be.revertedWith('Zero winner ticket count');
    });

    it.skip('Should revert if the VRF coordinator address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [nftlToken.address, pendingPeriod, totalWinnerTicketCount, ZERO_ADDRESS]),
      ).to.be.revertedWith('Zero address');
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

    it('Should revert if time is up', async () => {
      // increase time
      await increaseTime(pendingPeriod + 100);

      // deposit
      const nftlAmountToDeposit = nftlAmountPerTicket; // x1
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await expect(nftlRaffle.connect(alice).deposit(nftlAmountToDeposit)).to.be.revertedWith('Expired');
    });
  });

  describe('selectWinners', () => {
    beforeEach(async () => {
      let nftlAmountToDeposit = nftlAmountPerTicket.mul(10); // x10

      // Alice deposits NFTL and get 10 tickets
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      // Bob deposits NFTL and get 10 tickets
      await nftlToken.connect(bob).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit);

      // John deposits NFTL and get 10 tickets
      await nftlToken.connect(john).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(john).deposit(nftlAmountToDeposit);
    });

    it('Should be able to select the winners', async () => {
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner

      // increase time
      await increaseTime(pendingPeriod + 100);

      // select winners
      // await nftlRaffle.selectWinners();

      // console.log('winners = ', await nftlRaffle.getWinners());
      expect(await nftlRaffle.getWinners()).to.be.not.empty;
    });

    it('Should revert if the depositor count is not enough', async () => {
      const newTotalWinnerTicketCount = 50;
      await nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount);

      // increase time
      await increaseTime(pendingPeriod + 100);

      // select winners
      // await expect(nftlRaffle.selectWinners()).to.be.revertedWith('Not enough depositors');
    });

    it('Should revert if time is not up', async () => {
      // await expect(nftlRaffle.selectWinners()).to.be.revertedWith('Pending period');
    });

    it('Should revert if the caller is not the owner', async () => {
      // increase time
      await increaseTime(pendingPeriod + 100);

      // await expect(nftlRaffle.connect(alice).selectWinners()).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('updateRaffleStartAt', () => {
    it('Should be able to update the raffleStartAt', async () => {
      // update the raffleStartAt
      const newRaffleStartAt = (await getCurrentBlockTimestamp()).add(100);
      await nftlRaffle.updateRaffleStartAt(newRaffleStartAt);

      expect(await nftlRaffle.raffleStartAt()).to.equal(newRaffleStartAt);
    });

    it('Should revert if the timestamp is invalid', async () => {
      const newRaffleStartAt = (await getCurrentBlockTimestamp()).sub(100);
      await expect(nftlRaffle.updateRaffleStartAt(newRaffleStartAt)).to.be.revertedWith('Invalid timestamp');
    });

    it('Should revert if the timestamp is invalid', async () => {
      const newRaffleStartAt = (await getCurrentBlockTimestamp()).add(100);
      await expect(nftlRaffle.connect(alice).updateRaffleStartAt(newRaffleStartAt)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('updateTotalWinnerTicketCount', () => {
    it('Should be able to update the totalWinnerTicketCount', async () => {
      const newTotalWinnerTicketCount = 30;
      await nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount);

      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(newTotalWinnerTicketCount);
    });

    it('Should revert if the totalWinnerTicketCount is zero', async () => {
      const newTotalWinnerTicketCount = 0;
      await expect(nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount)).to.be.revertedWith(
        'Zero winner ticket count',
      );
    });

    it('Should revert if the caller is not the owner', async () => {
      const newTotalWinnerTicketCount = 30;
      await expect(
        nftlRaffle.connect(alice).updateTotalWinnerTicketCount(newTotalWinnerTicketCount),
      ).to.be.revertedWith('Ownable: caller is not the owner');
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
