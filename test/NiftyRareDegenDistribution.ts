import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import type { NiftyRareDegenDistribution, MockERC721 } from '../typechain-types';

describe('NiftyRareDegenDistribution', function () {
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let niftyWallet: SignerWithAddress;
  let niftyRareDegenDistribution: NiftyRareDegenDistribution;
  let niftyDegen: MockERC721;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, niftyWallet] = accounts;

    // Deploy NiftyDegen contracts
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    niftyDegen = await MockERC721.deploy();

    // Deploy NiftyRareDegenDistribution contract
    const NiftyRareDegenDistribution = await ethers.getContractFactory('NiftyRareDegenDistribution');
    niftyRareDegenDistribution = (await upgrades.deployProxy(NiftyRareDegenDistribution, [
      niftyDegen.address,
      niftyWallet.address,
    ])) as NiftyRareDegenDistribution;

    // mint the normal NiftyDegens
    for (let i = 0; i < 16; i++) {
      await niftyDegen.mint(alice.address); // TokenId: 0 - 15
    }

    for (let i = 0; i < 12; i++) {
      await niftyDegen.mint(niftyWallet.address); // TokenId: 16 - 27
    }

    // mint the rare NiftyDegens
    for (let i = 0; i < 10; i++) {
      await niftyDegen.mint(deployer.address); // TokenId: 28 - 37
    }
  });

  describe('Initialize', () => {
    it('Should be able to initialize the contract', async () => {
      const NiftyRareDegenDistribution = await ethers.getContractFactory('NiftyRareDegenDistribution');
      niftyRareDegenDistribution = (await upgrades.deployProxy(NiftyRareDegenDistribution, [
        niftyDegen.address,
        niftyWallet.address,
      ])) as NiftyRareDegenDistribution;
    });
  });

  describe('updateNiftyDegen', () => {
    it('Should be able to update the NiftyDegen address', async () => {
      expect(await niftyRareDegenDistribution.niftyDegen()).to.equal(niftyDegen.address);

      // set the NiftyDegen address
      await niftyRareDegenDistribution.updateNiftyDegen(bob.address);

      expect(await niftyRareDegenDistribution.niftyDegen()).to.equal(bob.address);
    });

    it('Should revert if the caller is not the owner', async () => {
      // set the NiftyDegen address
      await expect(niftyRareDegenDistribution.connect(alice).updateNiftyDegen(bob.address)).to.be.reverted;
    });
  });

  describe('updateNiftyWallet', () => {
    it('Should be able to update the nifty wallet address', async () => {
      expect(await niftyRareDegenDistribution.niftyWallet()).to.equal(niftyWallet.address);

      // set the nifty wallet address
      await niftyRareDegenDistribution.updateNiftyWallet(bob.address);

      expect(await niftyRareDegenDistribution.niftyWallet()).to.equal(bob.address);
    });

    it('Should revert if the caller is not the owner', async () => {
      // set the nifty wallet address
      await expect(niftyRareDegenDistribution.connect(alice).updateNiftyWallet(bob.address)).to.be.reverted;
    });
  });

  describe('depositRareDegens', () => {
    it('Should be able to deposit the rare degens', async () => {
      const rareDegenTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
      const rareDegenCount = 10;

      expect(await niftyRareDegenDistribution.getRareDegensCount()).to.equal(0);

      // deposit the rare degens
      await niftyDegen.setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.depositRareDegens(rareDegenTokenIds);

      expect(await niftyRareDegenDistribution.getRareDegensCount()).to.equal(rareDegenCount);
    });

    it('Should revert if the caller is not the owner', async () => {
      const rareDegenTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the rare degens
      await niftyDegen.connect(alice).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await expect(niftyRareDegenDistribution.connect(alice).depositRareDegens(rareDegenTokenIds)).to.be.reverted;
    });
  });

  describe('claimRandomRareDegen', () => {
    beforeEach(async () => {
      const rareDegenTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the rare degens
      await niftyDegen.setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.depositRareDegens(rareDegenTokenIds);
    });

    it('Should be able to claim the rare degen', async () => {
      // Alice claims the random rare degen, burn 8 normal degens to claim 1 rare degen
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7];

      let aliceDegenCountBefore = await niftyDegen.balanceOf(alice.address);
      let rareDegenCountBefore = await niftyRareDegenDistribution.getRareDegensCount();

      await niftyDegen.connect(alice).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.connect(alice).claimRandomRareDegen(degenTokenIdList);

      let aliceDegenCountAfter = await niftyDegen.balanceOf(alice.address);
      let rareDegenCountAfter = await niftyRareDegenDistribution.getRareDegensCount();

      expect(aliceDegenCountAfter).to.equal(aliceDegenCountBefore.sub(8).add(1));
      expect(rareDegenCountAfter).to.equal(rareDegenCountBefore.sub(1));

      // NiftyWallet claims the random rare degen, burn 12 normal degens to claim 1 rare degen
      degenTokenIdList = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];

      let niftyWalletDegenCountBefore = await niftyDegen.balanceOf(niftyWallet.address);
      rareDegenCountBefore = await niftyRareDegenDistribution.getRareDegensCount();

      await niftyDegen.connect(niftyWallet).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.connect(niftyWallet).claimRandomRareDegen(degenTokenIdList);

      let niftyWalletDegenCountAfter = await niftyDegen.balanceOf(niftyWallet.address);
      rareDegenCountAfter = await niftyRareDegenDistribution.getRareDegensCount();

      expect(niftyWalletDegenCountAfter).to.equal(niftyWalletDegenCountBefore.sub(12).add(1));
      expect(rareDegenCountAfter).to.equal(rareDegenCountBefore.sub(1));

      // Alice claims the random rare degen, burn 8 normal degens to claim 1 rare degen
      degenTokenIdList = [8, 9, 10, 11, 12, 13, 14, 15];

      aliceDegenCountBefore = await niftyDegen.balanceOf(alice.address);
      rareDegenCountBefore = await niftyRareDegenDistribution.getRareDegensCount();

      await niftyDegen.connect(alice).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.connect(alice).claimRandomRareDegen(degenTokenIdList);

      aliceDegenCountAfter = await niftyDegen.balanceOf(alice.address);
      rareDegenCountAfter = await niftyRareDegenDistribution.getRareDegensCount();

      expect(aliceDegenCountAfter).to.equal(aliceDegenCountBefore.sub(8).add(1));
      expect(rareDegenCountAfter).to.equal(rareDegenCountBefore.sub(1));
    });

    it('Should revert if the user doesn not burn 8 degens', async () => {
      // Alice claims the random rare degen, burn 8 normal degens to claim 1 rare degen
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7, 8];

      await niftyDegen.connect(alice).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await expect(niftyRareDegenDistribution.connect(alice).claimRandomRareDegen(degenTokenIdList)).to.be.revertedWith(
        'Need 8 degens',
      );
    });

    it('Should revert if the nifty wallet doesn not burn 12 degens', async () => {
      // NiftyWallet claims the random rare degen, burn 12 normal degens to claim 1 rare degen
      let degenTokenIdList = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];

      await niftyDegen.connect(niftyWallet).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await expect(
        niftyRareDegenDistribution.connect(niftyWallet).claimRandomRareDegen(degenTokenIdList),
      ).to.be.revertedWith('Need 12 degens');
    });

    it('Should revert if the contract is paused', async () => {
      // pause the distribution
      await niftyRareDegenDistribution.pause();

      // Alice claims the random rare degen, burn 8 normal degens to claim 1 rare degen
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7];

      await niftyDegen.connect(alice).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await expect(niftyRareDegenDistribution.connect(alice).claimRandomRareDegen(degenTokenIdList)).to.be.reverted;
    });
  });

  describe('withdrawAllRareDegens', () => {
    beforeEach(async () => {
      const rareDegenTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the rare degens
      await niftyDegen.setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.depositRareDegens(rareDegenTokenIds);
    });

    it('Should be able to withdraw all rare degens', async () => {
      const bobRareDegenBalanceBefore = await niftyDegen.balanceOf(bob.address);

      // withdraw all rare degens
      await niftyRareDegenDistribution.withdrawAllRareDegens(bob.address);

      const bobRareDegenBalanceAfter = await niftyDegen.balanceOf(bob.address);

      expect(bobRareDegenBalanceAfter).to.equal(bobRareDegenBalanceBefore.add(10));
    });

    it('Should revert if the caller is not the owner', async () => {
      // withdraw all rare degens
      await expect(niftyRareDegenDistribution.connect(bob).withdrawAllRareDegens(bob.address)).to.be.reverted;
    });
  });

  describe('pause/unpause', () => {
    it('Pause', async () => {
      expect(await niftyRareDegenDistribution.paused()).to.be.false;

      // Pause the distribution
      await niftyRareDegenDistribution.pause();

      // check pause status
      expect(await niftyRareDegenDistribution.paused()).to.be.true;
    });

    it('Unpause', async () => {
      // Pause the distribution
      await niftyRareDegenDistribution.pause();

      // Unpause the distribution
      await niftyRareDegenDistribution.unpause();

      // check pause status
      expect(await niftyRareDegenDistribution.paused()).to.be.false;
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(niftyRareDegenDistribution.connect(alice).pause()).to.be.reverted;
      await expect(niftyRareDegenDistribution.connect(alice).unpause()).to.be.reverted;
    });
  });
});
