import { expect } from 'chai';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { ethers } from 'hardhat';
import type { Signer } from 'ethers';
import type { MockERC721, NFTLToken } from '~/types/typechain';
import { deployMockERC721 } from './utils/contracts';

describe('NFTLToken', function () {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;
  let nft: MockERC721;
  let token: NFTLToken;
  let emissionStart: number;

  const DAY = 24 * 60 * 60;

  async function deployToken(start: number) {
    const factory = await ethers.getContractFactory('NFTLToken');
    return (await factory.deploy(start)) as unknown as NFTLToken;
  }

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    emissionStart = await time.latest();
    token = await deployToken(emissionStart);
    nft = await deployMockERC721();
    await nft.mint(await alice.getAddress());
    await nft.mint(await alice.getAddress());
    await nft.mint(await bob.getAddress());
    await token.setNFTAddress(await nft.getAddress());
  });

  it('initializes token metadata and a three-year emission window', async () => {
    expect(await token.name()).to.equal('Nifty League');
    expect(await token.symbol()).to.equal('NFTL');
    expect(await token.emissionStart()).to.equal(emissionStart);
    expect(await token.emissionEnd()).to.equal(emissionStart + DAY * 365 * 3);
  });

  it('allows the admin to configure the NFT contract exactly once', async () => {
    const fresh = await deployToken(await time.latest());

    await expect(fresh.setNFTAddress(ethers.ZeroAddress)).to.be.revertedWith('Invalid NFT address');
    await expect(fresh.connect(alice).setNFTAddress(await nft.getAddress())).to.be.reverted;
    await fresh.setNFTAddress(await nft.getAddress());
    await expect(fresh.setNFTAddress(await nft.getAddress())).to.be.revertedWith('Already set');
  });

  it('rejects accumulation before emissions start', async () => {
    const future = await deployToken((await time.latest()) + DAY);
    await future.setNFTAddress(await nft.getAddress());

    await expect(future.accumulated(0)).to.be.revertedWith('Emission has not started yet');
    await expect(future.accumulatedMultiCheck([0])).to.be.revertedWith('Emission has not started yet');
    await expect(future.connect(alice).claim([0])).to.be.revertedWith('Emission has not started yet');
  });

  it('accrues the initial allotment plus daily emissions', async () => {
    await time.increaseTo(emissionStart + DAY);

    const expected = ethers.parseEther('2000') + (await token.EMISSION_PER_DAY());
    expect(await token.getLastClaim(0)).to.equal(emissionStart);
    expect(await token.accumulated(0)).to.equal(expected);
    expect(await token.accumulatedMultiCheck([0, 1])).to.equal(expected * 2n);
  });

  it('caps accumulation at the emission end', async () => {
    const end = Number(await token.emissionEnd());
    await time.increaseTo(end + DAY);

    const expected = ethers.parseEther('2000') + (await token.EMISSION_PER_DAY()) * BigInt(365 * 3);
    expect(await token.accumulated(0)).to.equal(expected);
  });

  it('mints accumulated NFTL to the owner and advances the last-claim timestamp', async () => {
    await time.increaseTo(emissionStart + DAY);
    const aliceAddress = await alice.getAddress();
    const before = await time.latest();

    const transaction = await token.connect(alice).claim([0, 1]);
    await expect(transaction)
      .to.emit(token, 'Transfer')
      .withArgs(ethers.ZeroAddress, aliceAddress, await token.balanceOf(aliceAddress));

    expect(await token.balanceOf(aliceAddress)).to.be.greaterThan(ethers.parseEther('4000'));
    expect(await token.getLastClaim(0)).to.be.greaterThan(before);
    expect(await token.getLastClaim(1)).to.equal(await token.getLastClaim(0));
  });

  it('rejects invalid, duplicate, and non-owned token indices', async () => {
    await time.increaseTo(emissionStart + DAY);

    await expect(token.connect(alice).claim([9])).to.be.revertedWith('NFT at index not been minted');
    await expect(token.connect(alice).claim([0, 0])).to.be.revertedWith('Duplicate token index');
    await expect(token.connect(alice).claim([2])).to.be.revertedWith('Sender is not the owner');
    await expect(token.getLastClaim(9)).to.be.revertedWith('NFT at index not been minted');
  });

  it('rejects a second claim after the emission window is exhausted', async () => {
    await time.increaseTo(Number(await token.emissionEnd()) + 1);
    await token.connect(alice).claim([0]);

    expect(await token.accumulated(0)).to.equal(0);
    await expect(token.connect(alice).claim([0])).to.be.revertedWith('No accumulated NFTL');
  });
});
