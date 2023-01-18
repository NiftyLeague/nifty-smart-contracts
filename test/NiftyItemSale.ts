import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { constants } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import type { NiftyItemSale, NiftyEquipment, MockERC20 } from '../typechain';

describe('NiftySale', function () {
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let itemSale: NiftyItemSale;
  let items: NiftyEquipment;
  let nftl: MockERC20;

  const ONE_ETHER = ethers.utils.parseEther("1");

  const BURN_PERCENTAGE = 200;
  const TREASURY_PERCENTAGE = 300;
  const DAO_PERCENTAGE = 500;

  const toRole = (role: string) => {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(role));
  };

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, treasury, dao] = accounts;

    // Deploy NiftyLaunchComics contracts
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    nftl = await MockERC20.deploy('Mock NFTL', 'Mock NFTL');

    // Deploy NiftyItems contract
    const NiftyItems = await ethers.getContractFactory('NiftyEquipment');
    items = await NiftyItems.deploy('Nifty Items', 'NLT', 'https://api.nifty-league.com/items/');

    // Deploy NiftySale contract
    const NiftyItemSale = await ethers.getContractFactory('NiftyItemSale');
    itemSale = (await upgrades.deployProxy(NiftyItemSale, [
      items.address,
      nftl.address,
      treasury.address,
      dao.address,
      BURN_PERCENTAGE,
      TREASURY_PERCENTAGE,
      DAO_PERCENTAGE
    ])) as NiftyItemSale;

    // grant "MINTER_ROLE" of "NiftyItems" contracts to "NiftyItemSale" contract
    const MINTER_ROLE = toRole('MINTER_ROLE');
    await items.grantRole(MINTER_ROLE, itemSale.address);

    // transfer NFTL tokens to the users
    await nftl.transfer(alice.address, ONE_ETHER.mul(1000000)); // 1_000_000 NFTL
    await nftl.transfer(bob.address, ONE_ETHER.mul(1000000)); // 1_000_000 NFTL
  });

  describe('initialize', () => {
    it('Reverts if sum of percentages is not 1000', async () => {
      const newBurnPercentage = 100;
      const newTreasuryPercentage = 100;
      const newDAOPercentage = 100;

      // deploy NiftySale contract
      const NiftyItemSale = await ethers.getContractFactory('NiftyItemSale');
      await expect(upgrades.deployProxy(NiftyItemSale, [
        items.address,
        nftl.address,
        treasury.address,
        dao.address,
        newBurnPercentage,
        newTreasuryPercentage,
        newDAOPercentage
      ])).to.be.revertedWith('Invalid percentages');
    })
  });

  describe('setItemPrices', () => {
    it('Should be able to set itme prices', async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER.mul(100), ONE_ETHER.mul(200), ONE_ETHER.mul(300)];

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
      const tokenPrices = [ONE_ETHER.mul(100), ONE_ETHER.mul(200), ONE_ETHER.mul(300)];

      // set item prices
      await expect(itemSale.setItemPrices(tokenIds, tokenPrices)).to.be.revertedWith('Mismatched params');
    });

    it('Reverts if token ID < 7', async () => {
      const tokenIds = [6, 8, 9];
      const tokenPrices = [ONE_ETHER.mul(100), ONE_ETHER.mul(200), ONE_ETHER.mul(300)];

      // set item prices
      await expect(itemSale.setItemPrices(tokenIds, tokenPrices)).to.be.revertedWith('Token ID less than 7');
    });

    it('Reverts if token price is less thatn 1 NFTL', async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER.mul(100), 200, ONE_ETHER.mul(300)];

      // set item prices
      await expect(itemSale.setItemPrices(tokenIds, tokenPrices)).to.be.revertedWith('Price less than 1 NFTL');
    });
  });

  describe('setItemMaxCounts', () => {
    it('Should be able to set item max counts', async () => {
      const tokenIds = [7, 8, 9];
      const tokenMaxCount = [100, 200, 300];

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
      const tokenMaxCount = [100, 200, 300];

      // set item prices
      await expect(itemSale.setItemMaxCounts(tokenIds, tokenMaxCount)).to.be.revertedWith('Mismatched params');
    });

    it('Reverts if tokenID < 7', async () => {
      const tokenIds = [2, 8, 9];
      const tokenMaxCount = [100, 200, 300];

      // set item prices
      await expect(itemSale.setItemMaxCounts(tokenIds, tokenMaxCount)).to.be.revertedWith('Token ID less than 7');
    });

    it('Reverts if the max count to set is less than current total supply', async () => {
      const tokenIds = [7, 8, 9];
      const tokenMaxCount = [1, 2, 3];

      // mint some items
      await items.mintBatch(alice.address, tokenIds, [10, 20, 30], constants.HashZero);

      // set item prices
      await expect(itemSale.setItemMaxCounts(tokenIds, tokenMaxCount)).to.be.revertedWith('Max count less than total supply');
    });
  });

  describe('purchaseItems', () => {
    beforeEach(async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER.mul(100), ONE_ETHER.mul(200), ONE_ETHER.mul(300)];
      const tokenMaxCount = [100, 200, 300];

      // set item prices
      await itemSale.setItemPrices(tokenIds, tokenPrices);

      // set item max counts
      await itemSale.setItemMaxCounts(tokenIds, tokenMaxCount);
    });

    it('Should be able to purcahse items, no item limit', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1, 0, 5];

      expect(await items.balanceOf(alice.address, tokenIds[0])).to.equal(0);
      expect(await items.balanceOf(alice.address, tokenIds[1])).to.equal(0);
      expect(await items.balanceOf(alice.address, tokenIds[2])).to.equal(0);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);
      
      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);

      // get the total price
      let totalPrice = ONE_ETHER.mul('0');
      for (let i = 0; i < tokenIds.length; i++) {
        totalPrice = totalPrice.add(
          (await itemSale.itemPrices(tokenIds[i])).mul(tokenAmounts[i])
        );
      }

      // check balances
      const aliceNFTLBalanceAfter = await nftl.balanceOf(alice.address);
      expect(aliceNFTLBalanceAfter).to.equal(aliceNFTLBalanceBefore.sub(totalPrice));
      expect(await items.balanceOf(alice.address, tokenIds[0])).to.equal(tokenAmounts[0]);
      expect(await items.balanceOf(alice.address, tokenIds[1])).to.equal(tokenAmounts[1]);
      expect(await items.balanceOf(alice.address, tokenIds[2])).to.equal(tokenAmounts[2]);
    });

    it('Reverts if params are mismatched, no item limit', async () => {
      const tokenIds = [7, 8, 9, 10];
      const tokenAmounts = [1, 0, 5];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);

      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith('Mismatched params');
    });

    it('Reverts if token price is 0, no item limit', async () => {
      const tokenIds = [7, 8, 9, 10];
      const tokenAmounts = [1, 0, 5, 10];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);

      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith('Zero price');
    });

    it('Reverts if the item price was set, the item max count was set, and token amount to purcahse is exceeded, no item limit', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1, 0, 301];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);

      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith('Remaining count overflow');
    });

    it('Reverts if the item price was set, the item max count wasn not set, and token amount to purcahse is exceeded, no item limit', async () => {
      // add additiaion item price
      await itemSale.setItemPrices([10], [ONE_ETHER.mul(100)]);

      const tokenIds = [7, 8, 9, 10];
      const tokenAmounts = [1, 0, 301, 10];

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);

      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith('Remaining count overflow');
    });

    it('Should be able to purcahse items if item limit > 0 and the item count to purcahse is valid', async () => {
      const tokenId = 7;
      const limitCount = 1;

      // set item limit
      await itemSale.setItemLimit(tokenId, limitCount);

      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1, 0, 5];

      expect(await items.balanceOf(alice.address, tokenIds[0])).to.equal(0);
      expect(await items.balanceOf(alice.address, tokenIds[1])).to.equal(0);
      expect(await items.balanceOf(alice.address, tokenIds[2])).to.equal(0);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);
      
      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);

      // get the total price
      let totalPrice = ONE_ETHER.mul('0');
      for (let i = 0; i < tokenIds.length; i++) {
        totalPrice = totalPrice.add(
          (await itemSale.itemPrices(tokenIds[i])).mul(tokenAmounts[i])
        );
      }

      // check balances
      const aliceNFTLBalanceAfter = await nftl.balanceOf(alice.address);
      expect(aliceNFTLBalanceAfter).to.equal(aliceNFTLBalanceBefore.sub(totalPrice));
      expect(await items.balanceOf(alice.address, tokenIds[0])).to.equal(tokenAmounts[0]);
      expect(await items.balanceOf(alice.address, tokenIds[1])).to.equal(tokenAmounts[1]);
      expect(await items.balanceOf(alice.address, tokenIds[2])).to.equal(tokenAmounts[2]);
    });

    it('Revert if item limit > 0 and the item count to purcahse is valid', async () => {
      const tokenId = 7;
      const limitCount = 1;

      // set item limit
      await itemSale.setItemLimit(tokenId, limitCount);

      const tokenIds = [7, 8, 9];
      const tokenAmounts = [2, 0, 5];

      expect(await items.balanceOf(alice.address, tokenIds[0])).to.equal(0);
      expect(await items.balanceOf(alice.address, tokenIds[1])).to.equal(0);
      expect(await items.balanceOf(alice.address, tokenIds[2])).to.equal(0);

      // get the old NFTL balance
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);
      
      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await expect(itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts)).to.be.revertedWith('Item limit overflow');
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
      await expect(itemSale.updateTokenPercentages(newBurnPercentage, newTreasuryPercentage, newDAOPercentage)).to.be.revertedWith('Invalid percentages');
    });
  });

  describe('getRemainingItemCount', () => {
    beforeEach(async () => {
      const tokenIds = [7, 8, 9];
      const tokenPrices = [ONE_ETHER.mul(100), ONE_ETHER.mul(200), ONE_ETHER.mul(300)];
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
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);
      
      // purchase items
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
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
      const tokenPrices = [ONE_ETHER.mul(100), ONE_ETHER.mul(200), ONE_ETHER.mul(300)];
      const tokenAmounts = [1, 0, 5];
      const tokenMaxCount = [100, 200, 300];

      // set item prices
      await itemSale.setItemPrices(tokenIds, tokenPrices);

      // set item max counts
      await itemSale.setItemMaxCounts(tokenIds, tokenMaxCount);

      // purchase items
      const aliceNFTLBalanceBefore = await nftl.balanceOf(alice.address);
      await nftl.connect(alice).approve(itemSale.address, aliceNFTLBalanceBefore);
      await itemSale.connect(alice).purchaseItems(tokenIds, tokenAmounts);
    });

    it('Should withdraw NFTL tokens', async () => {
      const tokenIds = [7, 8, 9];
      const tokenAmounts = [1, 0, 5];

      // get the NFTL token total supply
      const totalSupply = await nftl.totalSupply();

      expect(await nftl.balanceOf(treasury.address)).to.equal(0);
      expect(await nftl.balanceOf(dao.address)).to.equal(0);

      // get the total price
      let totalPrice = ONE_ETHER.mul('0');
      for (let i = 0; i < tokenIds.length; i++) {
        totalPrice = totalPrice.add(
          (await itemSale.itemPrices(tokenIds[i])).mul(tokenAmounts[i])
        );
      }
      
      // withdraw NFTL tokens
      await itemSale.withdraw();

      // check the balances
      expect(await nftl.totalSupply()).to.equal(totalSupply.sub(totalPrice.mul(BURN_PERCENTAGE).div(1000)));
      expect(await nftl.balanceOf(treasury.address)).to.equal(totalPrice.mul(TREASURY_PERCENTAGE).div(1000));
      expect(await nftl.balanceOf(dao.address)).to.equal(totalPrice.mul(DAO_PERCENTAGE).div(1000));
    });
    
    it('Reverts if the params are mismatched', async () => {

    });
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
