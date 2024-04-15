import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import type { Signer } from 'ethers';
import type { ComicsBurner, NiftyMarketplace } from '~/types/typechain';
import { PANIC_CODES } from '@nomicfoundation/hardhat-chai-matchers/panic';

import { getPermitSignature } from '../scripts/permit';
import { deployMarketplace } from './utils/contracts';
import { forkImmutable } from './utils/network';

describe('IMX', function () {
  let signer: Signer;
  let bob: Signer;
  let niftyMarketplace: NiftyMarketplace;
  let comicsBurner: ComicsBurner;

  before(async () => {
    await forkImmutable();
    [signer, bob] = await ethers.getSigners();

    // deploy NiftyMarketplace ERC-1155 contract
    niftyMarketplace = await deployMarketplace();

    // deploy ComicsBurner contract
    const ComicsBurner = await ethers.getContractFactory('ComicsBurner');
    comicsBurner = (await upgrades.deployProxy(ComicsBurner, [
      await niftyMarketplace.getAddress(),
    ])) as unknown as ComicsBurner;

    // mint comics to Signer
    await niftyMarketplace.grantMinterRole(await signer.getAddress());
    await niftyMarketplace.safeMintBatch(
      await signer.getAddress(),
      [1, 2, 3, 4, 5, 6],
      [10, 9, 8, 7, 6, 5],
      ethers.ZeroHash,
    );
    await niftyMarketplace.safeMintBatch(
      await bob.getAddress(),
      [1, 2, 3, 4, 5, 6],
      [5, 5, 5, 5, 5, 5],
      ethers.ZeroHash,
    );
  });

  describe('NiftyMarketplace', function () {
    it('Should grant minter role to ComicsBurner', async function () {
      const MINTER_ROLE = await niftyMarketplace.MINTER_ROLE();
      await niftyMarketplace.renounceRole(MINTER_ROLE, await signer.getAddress());
      await niftyMarketplace.grantMinterRole(await comicsBurner.getAddress());
      expect(await niftyMarketplace.hasRole(MINTER_ROLE, await signer.getAddress())).to.be.false;
      expect(await niftyMarketplace.hasRole(MINTER_ROLE, await comicsBurner.getAddress())).to.be.true;
    });

    it('Initial supply should be properly initialized', async function () {
      const address = await signer.getAddress();
      expect(await niftyMarketplace.balanceOf(address, 1)).to.equal(10);
      expect(await niftyMarketplace.balanceOf(address, 2)).to.equal(9);
      expect(await niftyMarketplace.balanceOf(address, 3)).to.equal(8);
      expect(await niftyMarketplace.balanceOf(address, 4)).to.equal(7);
      expect(await niftyMarketplace.balanceOf(address, 5)).to.equal(6);
      expect(await niftyMarketplace.balanceOf(address, 6)).to.equal(5);

      expect(
        await niftyMarketplace.balanceOfBatch(
          [address, address, address, address, address, address],
          [1, 2, 3, 4, 5, 6],
        ),
      ).to.deep.equal([10, 9, 8, 7, 6, 5]);
    });
  });

  describe('ERC1155 permit', function () {
    let owner: string;
    let spender: string;

    before(async () => {
      owner = await signer.getAddress();
      spender = await comicsBurner.getAddress();
    });

    it('Should revert if permit is not used', async function () {
      expect(await niftyMarketplace.isApprovedForAll(owner, spender)).to.be.false;
      await expect(comicsBurner.burnComics([1], [3])).to.be.revertedWith(
        'ERC1155: caller is not token owner or approved',
      );
    });

    it('Should revert with bad signature', async function () {
      const deadline = ethers.MaxUint256;
      const signature = '0x0000000000000000000000000000000000000000';
      await expect(
        comicsBurner.burnComicsWithPermit([1, 3], [3, 1], deadline, signature),
      ).to.be.revertedWithCustomError(niftyMarketplace, 'InvalidSignature');
      await expect(
        comicsBurner.burnComicsForWithPermit(bob, [1], [1], deadline, signature),
      ).to.be.revertedWithCustomError(niftyMarketplace, 'InvalidSignature');
    });

    it('Should revert with expired permit', async function () {
      const deadline = BigInt(0);
      const { signature } = await getPermitSignature(signer, niftyMarketplace, comicsBurner, deadline);
      await expect(comicsBurner.burnComicsWithPermit([1], [3], deadline, signature)).to.be.revertedWithCustomError(
        niftyMarketplace,
        'PermitExpired',
      );
    });

    it('Correctly signs owner approval for contract', async function () {
      const deadline = ethers.MaxUint256;
      const { signature } = await getPermitSignature(signer, niftyMarketplace, comicsBurner, deadline);
      await comicsBurner.burnComicsWithPermit([1], [3], deadline, signature);
      expect(await niftyMarketplace.isApprovedForAll(owner, spender)).to.be.true;

      // Safe check
      expect(await niftyMarketplace.balanceOf(owner, 1)).to.equal(7);
      expect(await niftyMarketplace.balanceOf(owner, 101)).to.equal(3);
    });

    it('Should now be able to call without permit', async function () {
      await comicsBurner.burnComics([2], [2]);
      expect(await niftyMarketplace.balanceOf(owner, 2)).to.equal(7);
      expect(await niftyMarketplace.balanceOf(owner, 102)).to.equal(2);
    });

    it('Should be able to call with a new permit', async function () {
      const deadline = ethers.MaxUint256;
      const { signature } = await getPermitSignature(signer, niftyMarketplace, comicsBurner, deadline);
      await comicsBurner.burnComicsWithPermit([3], [1], deadline, signature);
      expect(await niftyMarketplace.balanceOf(owner, 3)).to.equal(7);
      expect(await niftyMarketplace.balanceOf(owner, 103)).to.equal(1);
    });

    it('Should be able to call on behalf of owner with permit', async function () {
      const deadline = ethers.MaxUint256;
      const { signature } = await getPermitSignature(bob, niftyMarketplace, comicsBurner, deadline);
      await comicsBurner.burnComicsForWithPermit(bob, [1], [1], deadline, signature);
      expect(await niftyMarketplace.balanceOf(bob, 1)).to.equal(4);
      expect(await niftyMarketplace.balanceOf(bob, 101)).to.equal(1);
    });
  });

  describe('ComicsBurner', function () {
    it('Should revert with mismatched input arrays', async function () {
      await expect(comicsBurner.burnComics([1, 2], [1]))
        .to.be.revertedWithCustomError(comicsBurner, 'InvalidInput')
        .withArgs('Arrays must have the same length');

      await expect(comicsBurner.burnComics([1], [1, 3, 5]))
        .to.be.revertedWithCustomError(comicsBurner, 'InvalidInput')
        .withArgs('Arrays must have the same length');
    });

    it('Should revert with invalid comic IDs', async function () {
      await expect(comicsBurner.burnComics([101], [1]))
        .to.be.revertedWithCustomError(comicsBurner, 'InvalidInput')
        .withArgs('Invalid comic ID');
    });

    it('Should revert with invalid burn values', async function () {
      await expect(comicsBurner.burnComics([1], [15])).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
      await expect(comicsBurner.burnComics([1], [8])).to.be.revertedWith('ERC1155: burn amount exceeds balance');
    });

    it('Should be able to burn a single comic', async function () {
      await expect(comicsBurner.burnComics([1], [1]))
        .to.emit(comicsBurner, 'ComicsBurned')
        .withArgs(signer, [1], [1])
        .and.to.emit(comicsBurner, 'ItemsMinted')
        .withArgs(signer, [101], [1]);

      expect(await niftyMarketplace.balanceOf(signer, 1)).to.equal(6);
      expect(await niftyMarketplace.balanceOf(signer, 101)).to.equal(4);
    });

    it('Should be able to burn multiple comics', async function () {
      await expect(comicsBurner.burnComics([1, 2, 3, 4, 5], [1, 2, 2, 2, 1]))
        .to.emit(comicsBurner, 'ComicsBurned')
        .withArgs(signer, [1, 2, 3, 4, 5], [1, 2, 2, 2, 1])
        .and.to.emit(comicsBurner, 'ItemsMinted')
        .withArgs(signer, [101, 102, 103, 104, 105], [1, 2, 2, 2, 1]);

      expect(await niftyMarketplace.balanceOf(signer, 1)).to.equal(5);
      expect(await niftyMarketplace.balanceOf(signer, 2)).to.equal(5);
      expect(await niftyMarketplace.balanceOf(signer, 3)).to.equal(5);
      expect(await niftyMarketplace.balanceOf(signer, 4)).to.equal(5);
      expect(await niftyMarketplace.balanceOf(signer, 5)).to.equal(5);

      expect(await niftyMarketplace.balanceOf(signer, 101)).to.equal(5);
      expect(await niftyMarketplace.balanceOf(signer, 102)).to.equal(4);
      expect(await niftyMarketplace.balanceOf(signer, 103)).to.equal(3);
      expect(await niftyMarketplace.balanceOf(signer, 104)).to.equal(2);
      expect(await niftyMarketplace.balanceOf(signer, 105)).to.equal(1);
    });

    it('Should be able to burn for a Citadel Key', async function () {
      await expect(comicsBurner.burnComics([1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1]))
        .to.emit(comicsBurner, 'ComicsBurned')
        .withArgs(signer, [1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1])
        .and.to.emit(comicsBurner, 'ItemsMinted')
        .withArgs(signer, [101, 102, 103, 104, 105, 106, 107], [0, 0, 0, 0, 0, 0, 1]);

      expect(await niftyMarketplace.balanceOf(signer, 107)).to.equal(1);
    });

    it('Should be able to burn for Citadel Keys + Items', async function () {
      await expect(comicsBurner.burnComics([1, 2, 3, 4, 5, 6], [2, 2, 3, 3, 4, 4]))
        .to.emit(comicsBurner, 'ComicsBurned')
        .withArgs(signer, [1, 2, 3, 4, 5, 6], [2, 2, 3, 3, 4, 4])
        .and.to.emit(comicsBurner, 'ItemsMinted')
        .withArgs(signer, [101, 102, 103, 104, 105, 106, 107], [0, 0, 1, 1, 2, 2, 2]);

      expect(await niftyMarketplace.balanceOf(signer, 107)).to.equal(3);
    });

    it('Should burn remaining comics with permit', async function () {
      const deadline = ethers.MaxUint256;
      const { signature } = await getPermitSignature(signer, niftyMarketplace, comicsBurner, deadline);
      await expect(comicsBurner.burnComicsWithPermit([1, 2, 3, 4, 5, 6], [2, 2, 1, 1, 0, 0], deadline, signature))
        .to.emit(comicsBurner, 'ComicsBurned')
        .withArgs(signer, [1, 2, 3, 4, 5, 6], [2, 2, 1, 1, 0, 0])
        .and.to.emit(comicsBurner, 'ItemsMinted')
        .withArgs(signer, [101, 102, 103, 104, 105, 106], [2, 2, 1, 1, 0, 0]);

      // prettier-ignore
      {
      const comicIds = [1, 2, 3, 4, 5, 6];
      expect(await niftyMarketplace.balanceOfBatch(comicIds.map(() => signer), comicIds)).to.deep.equal([0, 0, 0, 0, 0, 0]);
      expect(await niftyMarketplace.balanceOfBatch(comicIds.map(() => bob), comicIds)).to.deep.equal([4, 5, 5, 5, 5, 5]);

      const itemIds = [101, 102, 103, 104, 105, 106, 107];
      expect(await niftyMarketplace.balanceOfBatch(itemIds.map(() => signer), itemIds)).to.deep.equal([7, 6, 5, 4, 3, 2, 3]);
      expect(await niftyMarketplace.balanceOfBatch(itemIds.map(() => bob), itemIds)).to.deep.equal([1, 0, 0, 0, 0, 0, 0]);
      }
    });

    it('Should be able to burn on behalf of owner given signature', async function () {
      const deadline = ethers.MaxUint256;
      const { signature } = await getPermitSignature(bob, niftyMarketplace, comicsBurner, deadline);
      await expect(
        comicsBurner.burnComicsForWithPermit(bob, [1, 2, 3, 4, 5, 6], [4, 4, 4, 4, 4, 4], deadline, signature),
      )
        .to.emit(comicsBurner, 'ComicsBurned')
        .withArgs(bob, [1, 2, 3, 4, 5, 6], [4, 4, 4, 4, 4, 4])
        .and.to.emit(comicsBurner, 'ItemsMinted')
        .withArgs(bob, [101, 102, 103, 104, 105, 106, 107], [0, 0, 0, 0, 0, 0, 4]);

      expect(await niftyMarketplace.balanceOf(bob, 107)).to.equal(4);
    });
  });
});
