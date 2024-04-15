import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import type { Signer } from 'ethers';
import type { NFTL, NiftyMarketplace, Store } from '~/types/typechain';

import { NIFTY_LEDGER_DEPLOYER } from '~/constants/addresses';
import { getERC20Permit } from '../scripts/permit';
import { deployChildNFTL, deployMarketplace } from './utils/contracts';
import { forkImmutable } from './utils/network';

describe('IMX - Store', function () {
  let signer: Signer;
  let bob: Signer;
  let niftyMarketplace: NiftyMarketplace;
  let nftlToken: NFTL;
  let storeContract: Store;

  before(async () => {
    await forkImmutable();
    [signer, bob] = await ethers.getSigners();

    // deploy NiftyMarketplace ERC-1155 contract
    niftyMarketplace = await deployMarketplace();

    // deploy NFTL ERC-20 contract
    nftlToken = await deployChildNFTL();

    // deploy Store contract
    const Store = await ethers.getContractFactory('Store');
    storeContract = (await upgrades.deployProxy(Store, [
      await niftyMarketplace.getAddress(),
      await nftlToken.getAddress(),
      NIFTY_LEDGER_DEPLOYER,
    ])) as unknown as Store;

    // mint NFTL to Signer & Bob
    await nftlToken.mint(await signer.getAddress(), ethers.parseEther('100000'));
    await nftlToken.mint(await bob.getAddress(), ethers.parseEther('100000'));

    // init Store prices
    await storeContract.listNewItems([10, 11], [ethers.parseEther('1000'), ethers.parseEther('2000')], [100, 100]);
  });

  describe('NiftyMarketplace', function () {
    it('Should grant minter role to Store', async function () {
      const MINTER_ROLE = await niftyMarketplace.MINTER_ROLE();
      await niftyMarketplace.renounceRole(MINTER_ROLE, await signer.getAddress());
      await niftyMarketplace.grantMinterRole(await storeContract.getAddress());
      expect(await niftyMarketplace.hasRole(MINTER_ROLE, await signer.getAddress())).to.be.false;
      expect(await niftyMarketplace.hasRole(MINTER_ROLE, await storeContract.getAddress())).to.be.true;
    });
  });

  describe('NFTL', function () {
    it('Should be initialized with correct balances', async function () {
      expect(await nftlToken.balanceOf(signer)).to.equal(ethers.parseEther('100000'));
      expect(await nftlToken.balanceOf(bob)).to.equal(ethers.parseEther('100000'));
    });
  });

  describe('ERC20 permit', function () {
    let owner: string;
    let spender: string;

    before(async () => {
      owner = await signer.getAddress();
      spender = await storeContract.getAddress();
    });

    it('Should revert if permit is not used', async function () {
      expect(await nftlToken.allowance(owner, spender)).to.equal(0);
      await expect(storeContract.purchaseItems([10], [1])).to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('Should revert with bad signature', async function () {
      const value = ethers.MaxUint256;
      const deadline = ethers.MaxUint256;
      const signature = {
        v: 25n,
        r: '0x0000000000000000000000000000000000000000000000000000000000000000',
        s: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
      await expect(
        storeContract.purchaseItemsWithPermit([10, 12], [1, 2], value, deadline, signature),
      ).to.be.revertedWith('ECDSA: invalid signature');
      await expect(
        storeContract.purchaseItemsForWithPermit(bob, [10], [1], value, deadline, signature),
      ).to.be.revertedWith('ECDSA: invalid signature');
    });

    it('Should revert with expired permit', async function () {
      const value = ethers.MaxUint256;
      const deadline = BigInt(0);
      const { v, r, s } = await getERC20Permit(signer, nftlToken, storeContract, value, deadline);
      await expect(storeContract.purchaseItemsWithPermit([10], [1], value, deadline, { v, r, s })).to.be.revertedWith(
        'ERC20Permit: expired deadline',
      );
    });

    it('Should correctly sign owner approval for contract', async function () {
      const value = ethers.parseEther('5000');
      const deadline = ethers.MaxUint256;
      const { v, r, s } = await getERC20Permit(signer, nftlToken, storeContract, value, deadline);
      await storeContract.purchaseItemsWithPermit([10], [1], value, deadline, { v, r, s });
      expect(await nftlToken.balanceOf(NIFTY_LEDGER_DEPLOYER)).to.equal(ethers.parseEther('1000'));
      expect(await nftlToken.balanceOf(owner)).to.equal(ethers.parseEther('99000'));
      expect(await nftlToken.allowance(owner, spender)).to.equal(ethers.parseEther('4000'));
      expect(await niftyMarketplace.balanceOf(owner, 10)).to.equal(1);
    });

    it('Should now be able to call without permit', async function () {
      await storeContract.purchaseItems([10], [1]);
      expect(await nftlToken.allowance(owner, spender)).to.equal(ethers.parseEther('3000'));
      expect(await niftyMarketplace.balanceOf(owner, 10)).to.equal(2);
    });

    it('Should be able to call with a new permit', async function () {
      const value = ethers.MaxUint256;
      const deadline = ethers.MaxUint256;
      const { v, r, s } = await getERC20Permit(signer, nftlToken, storeContract, value, deadline);
      await storeContract.purchaseItemsWithPermit([10], [1], value, deadline, { v, r, s });
      expect(await nftlToken.allowance(owner, spender)).to.equal(value);
      expect(await niftyMarketplace.balanceOf(owner, 10)).to.equal(3);
    });

    it('Should be able to call with permit from contract', async function () {
      const value = ethers.MaxUint256;
      const deadline = ethers.MaxUint256;
      const { signature } = await getERC20Permit(signer, nftlToken, storeContract, value, deadline);
      const { v, r, s } = await storeContract.splitSignature(signature);
      await storeContract.purchaseItemsWithPermit([10], [1], value, deadline, { v, r, s });
      expect(await niftyMarketplace.balanceOf(owner, 10)).to.equal(4);
    });

    it('Should be able to call on behalf of owner with permit', async function () {
      const value = ethers.MaxUint256;
      const deadline = ethers.MaxUint256;
      const { v, r, s } = await getERC20Permit(bob, nftlToken, storeContract, value, deadline);
      await storeContract.purchaseItemsForWithPermit(bob, [10], [1], value, deadline, { v, r, s });
      expect(await niftyMarketplace.balanceOf(bob, 10)).to.equal(1);
    });
  });

  describe('Store', function () {
    describe('Errors', function () {
      it('Should revert with mismatched input arrays', async function () {
        await expect(storeContract.purchaseItems([10, 11], [1]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('Arrays must have the same length');

        await expect(storeContract.purchaseItems([10], [1, 3, 5]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('Arrays must have the same length');
      });

      it('Should revert if item is unavailable', async function () {
        await expect(storeContract.purchaseItems([101], [1]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('Item not available');
      });

      it('Should revert if no items are purchased', async function () {
        await expect(storeContract.purchaseItems([10, 11], [0, 0]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('No items to mint');
      });

      it('Should revert if user has insignificant NFTL balance', async function () {
        await expect(storeContract.purchaseItems([10, 11], [50, 50])).to.be.revertedWith(
          'ERC20: transfer amount exceeds balance',
        );
      });

      it('Should revert if item max supply is exceeded', async function () {
        await expect(storeContract.purchaseItems([10], [101]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('Item supply exceeded');
      });
    });

    describe('Admin', function () {
      it('Should allow owner to toggle item availability', async function () {
        await storeContract.setItemsAvailability([10], [false]);
        expect(await storeContract.isAvailable(10)).to.be.false;
        await expect(storeContract.purchaseItems([10], [1]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('Item not available');

        await storeContract.setItemsAvailability([10], [true]);
        expect(await storeContract.isAvailable(10)).to.be.true;
        await expect(storeContract.purchaseItems([10], [1])).to.not.be.reverted;
      });

      it('Should allow owner to increase item price', async function () {
        const newPrice = ethers.parseEther('3000');
        await storeContract.setItemsPrice([10], [newPrice]);
        expect(await storeContract.listingPrice(10)).to.equal(newPrice);

        await expect(storeContract.purchaseItems([10], [2]))
          .to.emit(storeContract, 'NftlSpent')
          .withArgs(signer, newPrice * 2n)
          .and.to.emit(storeContract, 'ItemsMinted')
          .withArgs(signer, [10], [2]);
      });

      it('Should allow owner to discount item price', async function () {
        const newPrice = ethers.parseEther('500');
        await storeContract.setItemsPrice([10], [newPrice]);
        expect(await storeContract.listingPrice(10)).to.equal(newPrice);

        await expect(storeContract.purchaseItems([10], [2]))
          .to.emit(storeContract, 'NftlSpent')
          .withArgs(signer, newPrice * 2n)
          .and.to.emit(storeContract, 'ItemsMinted')
          .withArgs(signer, [10], [2]);
      });

      it('Should allow owner to adjust item max supply', async function () {
        await storeContract.setItemsMaxSupply([10], [25]);
        expect(await storeContract.maxSupply(10)).to.equal(25);
        expect(await niftyMarketplace.totalSupply(10)).to.equal(10);

        await expect(storeContract.purchaseItems([10], [16]))
          .to.be.revertedWithCustomError(storeContract, 'InvalidInput')
          .withArgs('Item supply exceeded');

        await expect(storeContract.purchaseItems([10], [5])).to.not.be.reverted;
      });

      it('Should allow owner to list new items', async function () {
        const price = ethers.parseEther('500');
        await storeContract.listNewItems([12, 13, 14, 15], [price, price, price * 2n, price * 2n], [100, 100, 50, 50]);

        expect(await storeContract.isAvailable(12)).to.be.true;
        expect(await storeContract.isAvailable(13)).to.be.true;
        expect(await storeContract.isAvailable(14)).to.be.true;
        expect(await storeContract.isAvailable(15)).to.be.true;

        expect(await storeContract.listingPrice(12)).to.equal(price);
        expect(await storeContract.listingPrice(13)).to.equal(price);
        expect(await storeContract.listingPrice(14)).to.equal(price * 2n);
        expect(await storeContract.listingPrice(15)).to.equal(price * 2n);

        expect(await storeContract.maxSupply(12)).to.equal(100);
        expect(await storeContract.maxSupply(13)).to.equal(100);
        expect(await storeContract.maxSupply(14)).to.equal(50);
        expect(await storeContract.maxSupply(15)).to.equal(50);
      });
    });

    describe('Functionality', function () {
      it('Should pause item availability once supply is met', async function () {
        expect(await niftyMarketplace.totalSupply(10)).to.equal(15);
        expect(await storeContract.isAvailable(10)).to.be.true;

        await storeContract.purchaseItems([10], [10]);

        expect(await niftyMarketplace.totalSupply(10)).to.equal(25);
        expect(await storeContract.isAvailable(10)).to.be.false;
      });

      it('Should increment item totalSupply on purchase', async function () {
        expect(await niftyMarketplace.totalSupply(12)).to.equal(0);
        await storeContract.purchaseItems([12], [5]);
        expect(await niftyMarketplace.totalSupply(12)).to.equal(5);
      });

      it('Should be able to mint multiple items to user', async function () {
        const items = [13, 14, 15];
        const values = [2, 3, 4];

        await expect(storeContract.purchaseItems(items, values))
          .to.emit(storeContract, 'NftlSpent')
          .withArgs(
            signer,
            (await storeContract.listingPrice(13)) * 2n +
              (await storeContract.listingPrice(14)) * 3n +
              (await storeContract.listingPrice(15)) * 4n,
          )
          .and.to.emit(storeContract, 'ItemsMinted')
          .withArgs(signer, items, values);

        expect(await niftyMarketplace.balanceOf(signer, 13)).to.equal(2);
        expect(await niftyMarketplace.balanceOf(signer, 14)).to.equal(3);
        expect(await niftyMarketplace.balanceOf(signer, 15)).to.equal(4);
      });

      it('Should transfer the NFTL to treasury', async function () {
        const signerInitialBal = await nftlToken.balanceOf(signer);
        const bobInitialBal = await nftlToken.balanceOf(bob);
        const treasuryInitialBal = await nftlToken.balanceOf(NIFTY_LEDGER_DEPLOYER);

        const items = [13, 14];
        const values = [2, 1];
        const expectedValue = ethers.parseEther('500') * 2n + ethers.parseEther('1000');

        await expect(storeContract.purchaseItems(items, values))
          .to.emit(storeContract, 'NftlSpent')
          .withArgs(signer, expectedValue)
          .and.to.emit(storeContract, 'ItemsMinted')
          .withArgs(signer, items, values);

        const deadline = ethers.MaxUint256;
        const { v, r, s } = await getERC20Permit(bob, nftlToken, storeContract, expectedValue, deadline);
        await expect(storeContract.purchaseItemsForWithPermit(bob, items, values, expectedValue, deadline, { v, r, s }))
          .to.emit(storeContract, 'NftlSpent')
          .withArgs(bob, expectedValue)
          .and.to.emit(storeContract, 'ItemsMinted')
          .withArgs(bob, items, values);

        expect(await nftlToken.balanceOf(signer)).to.equal(signerInitialBal - expectedValue);
        expect(await nftlToken.balanceOf(bob)).to.equal(bobInitialBal - expectedValue);
        expect(await nftlToken.balanceOf(NIFTY_LEDGER_DEPLOYER)).to.equal(treasuryInitialBal + expectedValue * 2n);
      });
    });
  });
});
