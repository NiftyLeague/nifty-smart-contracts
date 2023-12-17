import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { type Signer } from 'ethers';

import { BURN_PERCENTAGE, DAO_PERCENTAGE, TREASURY_PERCENTAGE } from '~/constants/itemsSale';
import type { NiftyItemSale, NiftyEquipment, MockERC20 } from '~/types/typechain';

describe('NiftySale', function () {
  let accounts: Signer[];
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let treasury: Signer;
  let dao: Signer;
  let itemSale: NiftyItemSale;
  let items: NiftyEquipment;
  let nftl: MockERC20;

  const ONE_ETHER = ethers.parseEther('1');

  const toRole = (role: string) => {
    return ethers.keccak256(ethers.toUtf8Bytes(role));
  };

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, treasury, dao] = accounts;

    // Deploy NiftyLaunchComics contracts
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    nftl = (await MockERC20.deploy()) as unknown as MockERC20;

    // Deploy NiftyItems contract
    const NiftyItems = await ethers.getContractFactory('NiftyEquipment');
    items = (await NiftyItems.deploy(
      'Nifty Items',
      'NLT',
      'https://api.nifty-league.com/items/',
    )) as unknown as NiftyEquipment;

    // Deploy NiftySale contract
    const NiftyItemSale = await ethers.getContractFactory('NiftyItemSale');
    itemSale = (await upgrades.deployProxy(NiftyItemSale, [
      await items.getAddress(),
      await nftl.getAddress(),
      await treasury.getAddress(),
      await dao.getAddress(),
      BURN_PERCENTAGE,
      TREASURY_PERCENTAGE,
      DAO_PERCENTAGE,
    ])) as unknown as NiftyItemSale;

    // grant "MINTER_ROLE" of "NiftyItems" contracts to "NiftyItemSale" contract
    const MINTER_ROLE = toRole('MINTER_ROLE');
    await items.grantRole(MINTER_ROLE, await itemSale.getAddress());

    // transfer NFTL tokens to the users
    await nftl.mint(await deployer.getAddress(), ONE_ETHER * 10000000n);
    await nftl.transfer(await alice.getAddress(), ONE_ETHER * 1000000n); // 1_000_000 NFTL
    await nftl.transfer(await bob.getAddress(), ONE_ETHER * 1000000n); // 1_000_000 NFTL
  });

  describe('initialize', () => {
    it('Reverts if sum of percentages is not 1000', async () => {
      const newBurnPercentage = 100;
      const newTreasuryPercentage = 100;
      const newDAOPercentage = 100;

      // deploy NiftySale contract
      const NiftyItemSale = await ethers.getContractFactory('NiftyItemSale');
      await expect(
        upgrades.deployProxy(NiftyItemSale, [
          await items.getAddress(),
          await nftl.getAddress(),
          await treasury.getAddress(),
          await dao.getAddress(),
          newBurnPercentage,
          newTreasuryPercentage,
          newDAOPercentage,
        ]),
      ).to.be.revertedWith('Invalid percentages');
    });
  });

  describe('setItemPrices', () => {
    it('Should be able to set itme prices', async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER * 100n, ONE_ETHER * 200n, ONE_ETHER * 300n];

      expect(await itemSale.itemPrices(tokenIds[0])).to.equal(0);
      expect(await itemSale.itemPrices(tokenIds[1])).to.equal(0);
      expect(await itemSale.itemPrices(tokenIds[2])).to.equal(0);

      // set item prices
      await itemSale.setItemPrices(tokenIds, tokenPrices);

      // check the updated item prices
      expect(await itemSale.itemPrices(tokenIds[0])).to.equal(tokenPrices[0]);
      expect(await itemSale.itemPrices(tokenIds[1])).to.equal(tokenPrices[1]);
      expect(await itemSale.itemPrices(tokenIds[2])).to.equal(tokenPrices[2]);
    });

    it('Reverts if the params are mismatched', async () => {
      const tokenIds = [7, 8, 9, 10];
      const tokenPrices = [ONE_ETHER * 100n, ONE_ETHER * 200n, ONE_ETHER * 300n];

      // set item prices
      await expect(itemSale.setItemPrices(tokenIds, tokenPrices)).to.be.revertedWith('Mismatched params');
    });

    it('Reverts if token ID < 7', async () => {
      const tokenIds = [6, 8, 9];
      const tokenPrices = [ONE_ETHER * 100n, ONE_ETHER * 200n, ONE_ETHER * 300n];

      // set item prices
      await expect(itemSale.setItemPrices(tokenIds, tokenPrices)).to.be.revertedWith('Token ID less than 7');
    });

    it('Reverts if token price is less thatn 1 NFTL', async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER * 100n, 200n, ONE_ETHER * 300n];

      // set item prices
      await expect(itemSale.setItemPrices(tokenIds, tokenPrices)).to.be.revertedWith('Price less than 1 NFTL');
    });
  });

  describe('setItemMaxCounts', () => {
    it('Should be able to set item max counts', async () => {
      const tokenIds = [7, 8, 9];
      const tokenMaxCount = [100n, 200n, 300n];

      expect(await itemSale.itemMaxCounts(tokenIds[0])).to.equal(0);
      expect(await itemSale.itemMaxCounts(tokenIds[1])).to.equal(0);
      expect(await itemSale.itemMaxCounts(tokenIds[2])).to.equal(0);

      // set item max counts
      await itemSale.setItemMaxCounts(tokenIds, tokenMaxCount);

      // check item max counts
      expect(await itemSale.itemMaxCounts(tokenIds[0])).to.equal(tokenMaxCount[0]);
      expect(await itemSale.itemMaxCounts(tokenIds[1])).to.equal(tokenMaxCount[1]);
      expect(await itemSale.itemMaxCounts(tokenIds[2])).to.equal(tokenMaxCount[2]);
    });

    it('Reverts if the params are mismatched', async () => {
      const tokenIds = [7, 8, 9, 10];
      const tokenMaxCount = [100n, 200n, 300n];

      // set item prices
      await expect(itemSale.setItemMaxCounts(tokenIds, tokenMaxCount)).to.be.revertedWith('Mismatched params');
    });

    it('Reverts if tokenID < 7', async () => {
      const tokenIds = [2, 8, 9];
      const tokenMaxCount = [100n, 200n, 300n];

      // set item prices
      await expect(itemSale.setItemMaxCounts(tokenIds, tokenMaxCount)).to.be.revertedWith('Token ID less than 7');
    });

    it('Reverts if the max count to set is less than current total supply', async () => {
      const tokenIds = [7, 8, 9];
      const tokenMaxCount = [1, 2, 3];

      // mint some items
      await items.mintBatch(await alice.getAddress(), tokenIds, [10, 20, 30], ethers.ZeroHash);

      // set item prices
      await expect(itemSale.setItemMaxCounts(tokenIds, tokenMaxCount)).to.be.revertedWith(
        'Max count less than total supply',
      );
    });
  });

  describe('purchaseItems', () => {
    beforeEach(async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER * 100n, ONE_ETHER * 200n, ONE_ETHER * 300n];
      const tokenMaxCount = [100, 200, 300];

      // set item prices
      await itemSale.setItemPrices(tokenIds, tokenPrices);

      // set item max counts
      await itemSale.setItemMaxCounts(tokenIds, tokenMaxCount);
    });

    it('Should be able to purcahse items, no item limit', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1n, 0n, 5n];

      expect(await items.balanceOf(await alice.getAddress(), tokenIds[0])).to.equal(0);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[1])).to.equal(0);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[2])).to.equal(0);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);

      // get the total price
      let totalPrice = ONE_ETHER * 0n;
      for (let i = 0; i < tokenIds.length; i++) {
        totalPrice = totalPrice + (await itemSale.itemPrices(tokenIds[i])) * tokenAmounts[i];
      }

      // check balances
      const aliceNFTLBalanceAfter = await nftl.balanceOf(await alice.getAddress());
      expect(aliceNFTLBalanceAfter).to.equal(aliceNFTLBalanceBefore - totalPrice);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[0])).to.equal(tokenAmounts[0]);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[1])).to.equal(tokenAmounts[1]);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[2])).to.equal(tokenAmounts[2]);
    });

    it('Reverts if params are mismatched, no item limit', async () => {
      const tokenIds = [7, 8, 9, 10];
      const tokenAmounts = [1, 0, 5];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith(
        'Mismatched params',
      );
    });

    it('Reverts if token price is 0, no item limit', async () => {
      const tokenIds = [7, 8, 9, 10];
      const tokenAmounts = [1, 0, 5, 10];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith('Zero price');
    });

    it('Reverts if the item price was set, the item max count was set, and token amount to purcahse is exceeded, no item limit', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1, 0, 301];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith(
        'Remaining count overflow',
      );
    });

    it('Reverts if the item price was set, the item max count wasn not set, and token amount to purcahse is exceeded, no item limit', async () => {
      // add additiaion item price
      await itemSale.setItemPrices([10], [ONE_ETHER * 100n]);

      const tokenIds = [7, 8, 9, 10];
      const tokenAmounts = [1, 0, 301, 10];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith(
        'Remaining count overflow',
      );
    });

    it('Should be able to purcahse items if item limit > 0 and the item count to purcahse is valid', async () => {
      const tokenId = 7;
      const limitCount = 1;

      // set item limit
      await itemSale.setItemLimit(tokenId, limitCount);

      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1n, 0n, 5n];

      expect(await items.balanceOf(await alice.getAddress(), tokenIds[0])).to.equal(0);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[1])).to.equal(0);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[2])).to.equal(0);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);

      // get the total price
      let totalPrice = ONE_ETHER * 0n;
      for (let i = 0; i < tokenIds.length; i++) {
        totalPrice = totalPrice + (await itemSale.itemPrices(tokenIds[i])) * tokenAmounts[i];
      }

      // check balances
      const aliceNFTLBalanceAfter = await nftl.balanceOf(await alice.getAddress());
      expect(aliceNFTLBalanceAfter).to.equal(aliceNFTLBalanceBefore - totalPrice);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[0])).to.equal(tokenAmounts[0]);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[1])).to.equal(tokenAmounts[1]);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[2])).to.equal(tokenAmounts[2]);
    });

    it('Revert if item limit > 0 and the item count to purcahse is valid', async () => {
      const tokenId = 7;
      const limitCount = 1;

      // set item limit
      await itemSale.setItemLimit(tokenId, limitCount);

      const tokenIds = [7, 8, 9];
      const tokenAmounts = [2, 0, 5];

      expect(await items.balanceOf(await alice.getAddress(), tokenIds[0])).to.equal(0);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[1])).to.equal(0);
      expect(await items.balanceOf(await alice.getAddress(), tokenIds[2])).to.equal(0);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith(
        'Item limit overflow',
      );
    });
  });

  describe('updateTokenPercentages', () => {
    it('Should be able to update the percentages', async () => {
      const newBurnPercentage = 100;
      const newTreasuryPercentage = 800;
      const newDAOPercentage = 100;

      expect(await itemSale.burnPercentage()).to.equal(BURN_PERCENTAGE);
      expect(await itemSale.treasuryPercentage()).to.equal(TREASURY_PERCENTAGE);
      expect(await itemSale.daoPercentage()).to.equal(DAO_PERCENTAGE);

      // update percentages
      await itemSale.updateTokenPercentages(newBurnPercentage, newTreasuryPercentage, newDAOPercentage);

      // check percentages
      expect(await itemSale.burnPercentage()).to.equal(newBurnPercentage);
      expect(await itemSale.treasuryPercentage()).to.equal(newTreasuryPercentage);
      expect(await itemSale.daoPercentage()).to.equal(newDAOPercentage);
    });

    it('Reverts if sum of percentages is not 1000', async () => {
      const newBurnPercentage = 100;
      const newTreasuryPercentage = 100;
      const newDAOPercentage = 100;

      // update percentages
      await expect(
        itemSale.updateTokenPercentages(newBurnPercentage, newTreasuryPercentage, newDAOPercentage),
      ).to.be.revertedWith('Invalid percentages');
    });
  });

  describe('getRemainingItemCount', () => {
    beforeEach(async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER * 100n, ONE_ETHER * 200n, ONE_ETHER * 300n];
      const tokenMaxCount = [100, 0, 300];

      // set item prices
      await itemSale.setItemPrices(tokenIds, tokenPrices);

      // set item max counts
      await itemSale.setItemMaxCounts(tokenIds, tokenMaxCount);
    });

    it('Should be able to return the remaining itme count', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [0, 0, 5];

      // check old remaining item count
      expect(await itemSale.getRemainingItemCount(tokenIds[0])).to.equal(100);
      expect(await itemSale.getRemainingItemCount(tokenIds[1])).to.equal(0);
      expect(await itemSale.getRemainingItemCount(tokenIds[2])).to.equal(300);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());

      // purchase items
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);

      // check new remaining item count
      expect(await itemSale.getRemainingItemCount(tokenIds[0])).to.equal(100);
      expect(await itemSale.getRemainingItemCount(tokenIds[1])).to.equal(0);
      expect(await itemSale.getRemainingItemCount(tokenIds[2])).to.equal(295);
    });
  });

  describe('setItemLimit', () => {
    it('Should be able to set the item limit', async () => {
      const tokenId = 7;
      const limitCount = 10;

      // check old item limit
      expect(await itemSale.itemLimitPerAdress(tokenId)).to.equal(0);

      // set the item limit
      await itemSale.setItemLimit(tokenId, limitCount);

      // check new item limit
      expect(await itemSale.itemLimitPerAdress(tokenId)).to.equal(limitCount);
    });
  });

  describe('withdraw', () => {
    beforeEach(async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER * 100n, ONE_ETHER * 200n, ONE_ETHER * 300n];
      const tokenAmounts = [1, 0, 5];
      const tokenMaxCount = [100, 200, 300];

      // set item prices
      await itemSale.setItemPrices(tokenIds, tokenPrices);

      // set item max counts
      await itemSale.setItemMaxCounts(tokenIds, tokenMaxCount);

      // purchase items
      const aliceNFTLBalanceBefore = await nftl.balanceOf(await alice.getAddress());
      await nftl.connect(alice).approve(await itemSale.getAddress(), aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);
    });

    it('Should withdraw NFTL tokens', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1n, 0n, 5n];

      // get the NFTL token total supply
      const totalSupply = await nftl.totalSupply();

      expect(await nftl.balanceOf(await treasury.getAddress())).to.equal(0);
      expect(await nftl.balanceOf(await dao.getAddress())).to.equal(0);

      // get the total price
      let totalPrice = ONE_ETHER * 0n;
      for (let i = 0; i < tokenIds.length; i++) {
        totalPrice = totalPrice + (await itemSale.itemPrices(tokenIds[i])) * tokenAmounts[i];
      }

      // withdraw NFTL tokens
      await itemSale.withdraw();

      // check the balances
      expect(await nftl.totalSupply()).to.equal((totalSupply - totalPrice * BURN_PERCENTAGE) / 1000n);
      expect(await nftl.balanceOf(await treasury.getAddress())).to.equal((totalPrice * TREASURY_PERCENTAGE) / 1000n);
      expect(await nftl.balanceOf(await dao.getAddress())).to.equal((totalPrice * DAO_PERCENTAGE) / 1000n);
    });

    it('Reverts if the params are mismatched', async () => {});
  });

  describe('pause/unpause', () => {
    it('Pause', async () => {
      expect(await itemSale.paused()).to.be.false;

      // Pause item sale
      await itemSale.pause();

      // check pause status
      expect(await itemSale.paused()).to.be.true;
    });
    it('Unpause', async () => {
      // Pause item sale
      await itemSale.pause();

      // Unpause burnComics
      await itemSale.unpause();

      // check pause status
      expect(await itemSale.paused()).to.be.false;
    });
  });
});
