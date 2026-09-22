import { expect } from 'chai'
import { ethers, network } from '~/hardhat'
import type { Signer } from 'ethers'
import type { NFTLToken } from '~/types/typechain'
import { deployNFTL } from './utils/contracts'
import { resetLocalNetwork } from './utils/network'

describe('MerkleDistributorWithDeadline', function () {
  let owner: Signer
  let bob: Signer
  let token: NFTLToken
  const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

  before(async () => {
    await resetLocalNetwork()
    ;[owner, bob] = await ethers.getSigners()
    token = await deployNFTL()
  })

  describe('constructor', function () {
    it('Should revert EndTimeInPast when end time is in the past', async function () {
      const MerkleDistributorWithDeadline = await ethers.getContractFactory(
        'MerkleDistributorWithDeadline'
      )
      const deployTx = MerkleDistributorWithDeadline.deploy(
        await token.getAddress(),
        ZERO_BYTES32,
        Math.floor(Date.now() / 1000) - 100
      )
      let caught = false
      try {
        await deployTx
      } catch (err: any) {
        caught = true
        expect(err.message).to.include('EndTimeInPast')
      }
      expect(caught).to.be.true
    })
  })

  describe('withdraw', function () {
    it('Should reject withdraw before deadline', async function () {
      const snapshot = await network.provider.send('evm_snapshot')
      try {
        const block = await ethers.provider.getBlock('latest')
        const evmTimestamp = Number(block.timestamp)
        const endTime = evmTimestamp + 31536000
        const MerkleDistributorWithDeadline = await ethers.getContractFactory(
          'MerkleDistributorWithDeadline'
        )
        const distributor = (await MerkleDistributorWithDeadline.deploy(
          await token.getAddress(),
          ZERO_BYTES32,
          endTime
        )) as unknown as any

        await expect(distributor.connect(owner).withdraw()).to.be.revertedWithCustomError(
          distributor,
          'NoWithdrawDuringClaim'
        )
      } finally {
        await network.provider.send('evm_revert', [snapshot])
      }
    })

    it('Should transfer remaining tokens after deadline passes', async function () {
      const snapshot = await network.provider.send('evm_snapshot')
      try {
        const block = await ethers.provider.getBlock('latest')
        const evmTimestamp = Number(block.timestamp)
        const endTime = evmTimestamp + 31536000
        const MerkleDistributorWithDeadline = await ethers.getContractFactory(
          'MerkleDistributorWithDeadline'
        )
        const distributor = (await MerkleDistributorWithDeadline.deploy(
          await token.getAddress(),
          ZERO_BYTES32,
          endTime
        )) as unknown as any

        await token.mint(await distributor.getAddress(), 1000n)
        expect(await token.balanceOf(await distributor.getAddress())).to.equal(1000n)

        await network.provider.send('evm_increaseTime', [31536001])
        await network.provider.send('evm_mine')

        const recipient = await owner.getAddress()
        const tx = await distributor.connect(owner).withdraw()
        const receipt = await tx.wait()

        const transferEvent = receipt?.logs.find(
          (log: { topics: string[] }) =>
            log.topics[0] === ethers.id('Transfer(address,address,uint256)')
        )
        expect(transferEvent).to.not.be.undefined

        expect(await token.balanceOf(await distributor.getAddress())).to.equal(0n)
        expect(await token.balanceOf(recipient)).to.equal(1000n)
      } finally {
        await network.provider.send('evm_revert', [snapshot])
      }
    })
  })

  describe('claim', function () {
    it('Should revert ClaimWindowFinished after deadline passes', async function () {
      const snapshot = await network.provider.send('evm_snapshot')
      try {
        const block = await ethers.provider.getBlock('latest')
        const evmTimestamp = Number(block.timestamp)
        const endTime = evmTimestamp + 31536000
        const MerkleDistributorWithDeadline = await ethers.getContractFactory(
          'MerkleDistributorWithDeadline'
        )
        const distributor = (await MerkleDistributorWithDeadline.deploy(
          await token.getAddress(),
          ZERO_BYTES32,
          endTime
        )) as unknown as any

        await network.provider.send('evm_increaseTime', [31536001])
        await network.provider.send('evm_mine')

        await expect(
          distributor.claim(0, await owner.getAddress(), 100n, [])
        ).to.be.revertedWithCustomError(distributor, 'ClaimWindowFinished')
      } finally {
        await network.provider.send('evm_revert', [snapshot])
      }
    })
  })
})
