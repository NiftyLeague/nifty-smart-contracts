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

  const ONE_ETHER = ethers.utils.parseEther('1');

  const toRole = (role: string) => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role));
  };

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

  describe('updateNiftyDegen', () => {
    it('Should be able to update the NiftyDegen address', async () => {
      expect(await niftyRareDegenDistribution.niftyDegen()).to.equal(niftyDegen.address);

      // set the NiftyDegen address
      await niftyRareDegenDistribution.updateNiftyDegen(bob.address);

      expect(await niftyRareDegenDistribution.niftyDegen()).to.equal(bob.address);
    });
  });

  describe('updateNiftyWallet', () => {
    it('Should be able to update the nifty wallet address', async () => {
      expect(await niftyRareDegenDistribution.niftyWallet()).to.equal(niftyWallet.address);

      // set the nifty wallet address
      await niftyRareDegenDistribution.updateNiftyWallet(bob.address);

      expect(await niftyRareDegenDistribution.niftyWallet()).to.equal(bob.address);
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
  });

  describe.skip('claimRandomRareDegen', () => {
    beforeEach(async () => {
      const rareDegenTokenIds = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];

      // deposit the rare degens
      await niftyDegen.setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.depositRareDegens(rareDegenTokenIds);
    });

    it('Should be able to claim the rare degen', async () => {
      let degenTokenIdList = [0, 1, 2, 3, 4, 5, 6, 7];

      const aliceDegenCountBefore = await niftyDegen.balanceOf(alice.address);
      const rareDegenCountBefore = await niftyRareDegenDistribution.getRareDegensCount();

      // Alice claims the random rare degen
      await niftyDegen.connect(alice).setApprovalForAll(niftyRareDegenDistribution.address, true);
      await niftyRareDegenDistribution.connect(alice).claimRandomRareDegen(degenTokenIdList);

      // console.log(await niftyRareDegenDistribution.getRareDegenTokenIds());

      const aliceDegenCountAfter = await niftyDegen.balanceOf(alice.address);
      const rareDegenCountAfter = await niftyRareDegenDistribution.getRareDegensCount();

      expect(aliceDegenCountAfter).to.equal(aliceDegenCountBefore.sub(8));
    });
  });

  describe('pause/unpause', () => {
    it('Pause', async () => {
      expect(await niftyRareDegenDistribution.paused()).to.be.false;

      // Pause item sale
      await niftyRareDegenDistribution.pause();

      // check pause status
      expect(await niftyRareDegenDistribution.paused()).to.be.true;
    });
    it('Unpause', async () => {
      // Pause item sale
      await niftyRareDegenDistribution.pause();

      // Unpause burnComics
      await niftyRareDegenDistribution.unpause();

      // check pause status
      expect(await niftyRareDegenDistribution.paused()).to.be.false;
    });
  });
});
