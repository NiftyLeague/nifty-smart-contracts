import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import type { HydraDistributor, MockERC721 } from '../typechain-types';

describe('HydraDistributor', function () {
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let niftyWallet: SignerWithAddress;
  let hydraDistributor: HydraDistributor;
  let niftyDegen: MockERC721;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, niftyWallet] = accounts;

    // Deploy NiftyDegen contracts
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    niftyDegen = await MockERC721.deploy();

    // Deploy HydraDistributor contract
    const HydraDistributor = await ethers.getContractFactory('HydraDistributor');
    hydraDistributor = (await upgrades.deployProxy(HydraDistributor, [
      niftyDegen.address,
      niftyWallet.address,
    ])) as HydraDistributor;

    // mint the normal NiftyDegens
    for (let i = 0; i < 16; i++) {
      await niftyDegen.mint(alice.address); // TokenId: 0 - 15
    }

    for (let i = 0; i < 12; i++) {
      await niftyDegen.mint(niftyWallet.address); // TokenId: 16 - 27
    }

    // mint the Hydra
    for (let i = 0; i < 10; i++) {
      await niftyDegen.mint(deployer.address); // TokenId: 28 - 37
    }
  });

  describe('Initialize', () => {
    it('Should be able to initialize the contract', async () => {
      const HydraDistributor = await ethers.getContractFactory('HydraDistributor');
      hydraDistributor = (await upgrades.deployProxy(HydraDistributor, [
        niftyDegen.address,
        niftyWallet.address,
      ])) as HydraDistributor;
    });
  });

  describe('updateNiftyDegen', () => {
    it('Should be able to update the NiftyDegen address', async () => {
      expect(await hydraDistributor.niftyDegen()).to.equal(niftyDegen.address);

      // set the NiftyDegen address
      await hydraDistributor.updateNiftyDegen(bob.address);

      expect(await hydraDistributor.niftyDegen()).to.equal(bob.address);
    });

    it('Should revert if the caller is not the owner', async () => {
      // set the NiftyDegen address
      await expect(hydraDistributor.connect(alice).updateNiftyDegen(bob.address)).to.be.reverted;
    });
  });

  describe('updateNiftyWallet', () => {
    it('Should be able to update the nifty wallet address', async () => {
      expect(await hydraDistributor.niftyWallet()).to.equal(niftyWallet.address);

      // set the nifty wallet address
      await hydraDistributor.updateNiftyWallet(bob.address);

      expect(await hydraDistributor.niftyWallet()).to.equal(bob.address);
    });

    it('Should revert if the caller is not the owner', async () => {
      // set the nifty wallet address
      await expect(hydraDistributor.connect(alice).updateNiftyWallet(bob.address)).to.be.reverted;
    });
  });

  describe('depositHydra', () => {
    it('Should be able to deposit the Hydra', async () => {
      const hydraTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
      const hydraCount = 10;

      expect(await hydraDistributor.getHydraCount()).to.equal(0);

      // deposit the Hydra
      await niftyDegen.setApprovalForAll(hydraDistributor.address, true);
      await hydraDistributor.depositHydra(hydraTokenIds);

      expect(await hydraDistributor.getHydraCount()).to.equal(hydraCount);
    });

    it('Should revert if the caller is not the owner', async () => {
      const hydraTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the Hydra
      await niftyDegen.connect(alice).setApprovalForAll(hydraDistributor.address, true);
      await expect(hydraDistributor.connect(alice).depositHydra(hydraTokenIds)).to.be.reverted;
    });
  });

  describe('claimRandomHydra', () => {
    beforeEach(async () => {
      const hydraTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the Hydra
      await niftyDegen.setApprovalForAll(hydraDistributor.address, true);
      await hydraDistributor.depositHydra(hydraTokenIds);
    });

    it('Should be able to claim the Hydra', async () => {
      // Alice claims the random Hydra, burn 8 normal degens to claim 1 Hydra
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7];

      let aliceDegenCountBefore = await niftyDegen.balanceOf(alice.address);
      let hydraCountBefore = await hydraDistributor.getHydraCount();

      await niftyDegen.connect(alice).setApprovalForAll(hydraDistributor.address, true);
      await hydraDistributor.connect(alice).claimRandomHydra(degenTokenIdList);

      //
      console.log(await hydraDistributor.getHydraTokenIds());

      let aliceDegenCountAfter = await niftyDegen.balanceOf(alice.address);
      let hydraCountAfter = await hydraDistributor.getHydraCount();

      expect(aliceDegenCountAfter).to.equal(aliceDegenCountBefore.sub(8).add(1));
      expect(hydraCountAfter).to.equal(hydraCountBefore.sub(1));

      // NiftyWallet claims the random Hydra, burn 12 normal degens to claim 1 Hydra
      degenTokenIdList = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];

      let niftyWalletDegenCountBefore = await niftyDegen.balanceOf(niftyWallet.address);
      hydraCountBefore = await hydraDistributor.getHydraCount();

      await niftyDegen.connect(niftyWallet).setApprovalForAll(hydraDistributor.address, true);
      await hydraDistributor.connect(niftyWallet).claimRandomHydra(degenTokenIdList);

      //
      console.log(await hydraDistributor.getHydraTokenIds());

      let niftyWalletDegenCountAfter = await niftyDegen.balanceOf(niftyWallet.address);
      hydraCountAfter = await hydraDistributor.getHydraCount();

      expect(niftyWalletDegenCountAfter).to.equal(niftyWalletDegenCountBefore.sub(12).add(1));
      expect(hydraCountAfter).to.equal(hydraCountBefore.sub(1));

      // Alice claims the random Hydra, burn 8 normal degens to claim 1 Hydra
      degenTokenIdList = [8, 9, 10, 11, 12, 13, 14, 15];

      aliceDegenCountBefore = await niftyDegen.balanceOf(alice.address);
      hydraCountBefore = await hydraDistributor.getHydraCount();

      await niftyDegen.connect(alice).setApprovalForAll(hydraDistributor.address, true);
      await hydraDistributor.connect(alice).claimRandomHydra(degenTokenIdList);

      //
      console.log(await hydraDistributor.getHydraTokenIds());

      aliceDegenCountAfter = await niftyDegen.balanceOf(alice.address);
      hydraCountAfter = await hydraDistributor.getHydraCount();

      expect(aliceDegenCountAfter).to.equal(aliceDegenCountBefore.sub(8).add(1));
      expect(hydraCountAfter).to.equal(hydraCountBefore.sub(1));
    });

    it('Should revert if the user doesn not burn 8 degens', async () => {
      // Alice claims the random Hydra, burn 8 normal degens to claim 1 Hydra
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7, 8];

      await niftyDegen.connect(alice).setApprovalForAll(hydraDistributor.address, true);
      await expect(hydraDistributor.connect(alice).claimRandomHydra(degenTokenIdList)).to.be.revertedWith(
        'Need 8 degens',
      );
    });

    it('Should revert if the nifty wallet doesn not burn 12 degens', async () => {
      // NiftyWallet claims the random Hydra, burn 12 normal degens to claim 1 Hydra
      let degenTokenIdList = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26];

      await niftyDegen.connect(niftyWallet).setApprovalForAll(hydraDistributor.address, true);
      await expect(hydraDistributor.connect(niftyWallet).claimRandomHydra(degenTokenIdList)).to.be.revertedWith(
        'Need 12 degens',
      );
    });

    it('Should revert if the contract is paused', async () => {
      // pause the distribution
      await hydraDistributor.pause();

      // Alice claims the random Hydra, burn 8 normal degens to claim 1 Hydra
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7];

      await niftyDegen.connect(alice).setApprovalForAll(hydraDistributor.address, true);
      await expect(hydraDistributor.connect(alice).claimRandomHydra(degenTokenIdList)).to.be.reverted;
    });
  });

  describe('withdrawAllHydra', () => {
    beforeEach(async () => {
      const hydraTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the Hydra
      await niftyDegen.setApprovalForAll(hydraDistributor.address, true);
      await hydraDistributor.depositHydra(hydraTokenIds);
    });

    it('Should be able to withdraw all Hydra', async () => {
      const bobHydraBalanceBefore = await niftyDegen.balanceOf(bob.address);

      // withdraw all Hydra
      await hydraDistributor.withdrawAllHydra(bob.address);

      const bobHydraBalanceAfter = await niftyDegen.balanceOf(bob.address);

      expect(bobHydraBalanceAfter).to.equal(bobHydraBalanceBefore.add(10));
    });

    it('Should revert if the caller is not the owner', async () => {
      // withdraw all Hydra
      await expect(hydraDistributor.connect(bob).withdrawAllHydra(bob.address)).to.be.reverted;
    });
  });

  describe('pause/unpause', () => {
    it('Pause', async () => {
      expect(await hydraDistributor.paused()).to.be.false;

      // Pause the distribution
      await hydraDistributor.pause();

      // check pause status
      expect(await hydraDistributor.paused()).to.be.true;
    });

    it('Unpause', async () => {
      // Pause the distribution
      await hydraDistributor.pause();

      // Unpause the distribution
      await hydraDistributor.unpause();

      // check pause status
      expect(await hydraDistributor.paused()).to.be.false;
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(hydraDistributor.connect(alice).pause()).to.be.reverted;
      await expect(hydraDistributor.connect(alice).unpause()).to.be.reverted;
    });
  });
});
