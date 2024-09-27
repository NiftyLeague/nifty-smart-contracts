import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { Signer } from 'ethers';

import type { BalanceManagerDistributor, BalanceManagerDistributor__factory, NFTLToken } from '~/types/typechain';
import BalanceTree from '~/scripts/merkle-distributor/helpers/balance-tree';
import { deployNFTL } from './utils/contracts';

type Contract = BalanceManagerDistributor;
type ContractFactory = BalanceManagerDistributor__factory;

const overrides = {
  gasLimit: 9999999,
};
const gasUsed = {
  MerkleDistributor: {
    twoAccountTree: 81970,
    largerTreeFirstClaim: 85307,
    largerTreeSecondClaim: 68207,
    realisticTreeGas: 95256,
    realisticTreeGasDeeperNode: 95172,
    realisticTreeGasAverageRandom: 78598,
    realisticTreeGasAverageFirst25: 62332,
  },
  MerkleDistributorWithDeadline: {
    twoAccountTree: 82102,
    largerTreeFirstClaim: 85439,
    largerTreeSecondClaim: 68339,
    realisticTreeGas: 95388,
    realisticTreeGasDeeperNode: 95304,
    realisticTreeGasAverageRandom: 78730,
    realisticTreeGasAverageFirst25: 62464,
  },
};

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

const deployContract = async (factory: ContractFactory, tokenAddress: string, merkleRoot: string) => {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const distributor = await factory.deploy(tokenAddress, merkleRoot, currentTimestamp + 31536000, overrides);
  return distributor;
};

describe('BalanceManagerDistributor', () => {
  let token: NFTLToken;
  let distributorFactory: ContractFactory;
  let wallet0: Signer;
  let wallet1: Signer;
  let wallets: Signer[];

  beforeEach(async () => {
    wallets = await ethers.getSigners();
    wallet0 = wallets[0];
    wallet1 = wallets[1];
    token = await deployNFTL();
    distributorFactory = await ethers.getContractFactory('BalanceManagerDistributor');
  });

  describe('#token', () => {
    it('returns the token address', async () => {
      const distributor = await deployContract(distributorFactory, await token.getAddress(), ZERO_BYTES32);
      expect(await distributor.token()).to.eq(await token.getAddress());
    });
  });

  describe('#merkleRoot', () => {
    it('returns the zero merkle root', async () => {
      const distributor = await deployContract(distributorFactory, await token.getAddress(), ZERO_BYTES32);
      expect(await distributor.merkleRoot()).to.eq(ZERO_BYTES32);
    });
  });

  describe('#admin', () => {
    it('cannot withdraw during claim', async () => {
      const distributor = await deployContract(distributorFactory, await token.getAddress(), ZERO_BYTES32);
      await expect(distributor.withdraw()).to.be.revertedWithCustomError(distributor, 'NoWithdrawDuringClaim');
    });
  });

  describe('#claim', () => {
    it('fails for empty proof', async () => {
      const distributor = await deployContract(distributorFactory, await token.getAddress(), ZERO_BYTES32);
      await expect(distributor.claim(0, await wallet0.getAddress(), 10n, [])).to.be.revertedWithCustomError(
        distributor,
        'InvalidProof',
      );
    });

    it('fails for invalid index', async () => {
      const distributor = await deployContract(distributorFactory, await token.getAddress(), ZERO_BYTES32);
      await expect(distributor.claim(0, await wallet0.getAddress(), 10n, [])).to.be.revertedWithCustomError(
        distributor,
        'InvalidProof',
      );
    });

    describe('two account tree', () => {
      let distributor: Contract;
      let tree: BalanceTree;
      beforeEach('deploy', async () => {
        tree = new BalanceTree([
          { account: await wallet0.getAddress(), amount: 100n }, // Use bigint for amounts
          { account: await wallet1.getAddress(), amount: 101n }, // Use bigint for amounts
        ]);
        distributor = await deployContract(distributorFactory, await token.getAddress(), tree.getHexRoot());
        await token.mint(await distributor.getAddress(), 201n); // Use bigint for amounts
      });

      it('successful claim', async () => {
        const proof0 = tree.getProof(0, await wallet0.getAddress(), 100n);
        await expect(distributor.claim(0, await wallet0.getAddress(), 100n, proof0, overrides))
          .to.emit(distributor, 'Claimed')
          .withArgs(0, await wallet0.getAddress(), 100n);
        const proof1 = tree.getProof(1, await wallet1.getAddress(), 101n);
        await expect(distributor.claim(1, await wallet1.getAddress(), 101n, proof1, overrides))
          .to.emit(distributor, 'Claimed')
          .withArgs(1, await wallet1.getAddress(), 101n);
      });

      it('transfers the token', async () => {
        const proof0 = tree.getProof(0, await wallet0.getAddress(), 100n);
        expect(await token.balanceOf(await wallet0.getAddress())).to.eq(0);
        await distributor.claim(0, await wallet0.getAddress(), 100n, proof0, overrides);
        expect(await token.balanceOf(await wallet0.getAddress())).to.eq(100n);
      });

      it('sets #isClaimed', async () => {
        const proof0 = tree.getProof(0, await wallet0.getAddress(), 100n);
        expect(await distributor.isClaimed(0)).to.eq(false);
        expect(await distributor.isClaimed(1)).to.eq(false);
        await distributor.claim(0, await wallet0.getAddress(), 100n, proof0, overrides);
        expect(await distributor.isClaimed(0)).to.eq(true);
        expect(await distributor.isClaimed(1)).to.eq(false);
      });

      it('cannot allow two claims', async () => {
        const proof0 = tree.getProof(0, await wallet0.getAddress(), 100n);
        await distributor.claim(0, await wallet0.getAddress(), 100n, proof0, overrides);
        await expect(
          distributor.claim(0, await wallet0.getAddress(), 100n, proof0, overrides),
        ).to.be.revertedWithCustomError(distributor, 'AlreadyClaimed');
      });

      xit('gas', async () => {
        const proof = tree.getProof(0, await wallet0.getAddress(), 100n);
        const tx = await distributor.claim(0, await wallet0.getAddress(), 100n, proof, overrides);
        const receipt = await tx.wait();
        expect(receipt?.gasUsed).to.eq(gasUsed['BalanceManagerDistributor' as keyof typeof gasUsed].twoAccountTree);
      });
    });
  });
});
