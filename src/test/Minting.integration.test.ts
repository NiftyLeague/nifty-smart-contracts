import { expect } from 'chai'
import { ethers } from '~/hardhat'
import type { MintingTestHelper } from '~/types/typechain'

describe('Minting library', function () {
  let helper: MintingTestHelper

  beforeEach(async () => {
    const Factory = await ethers.getContractFactory('MintingTestHelper')
    helper = (await Factory.deploy()) as unknown as MintingTestHelper
  })

  describe('split', function () {
    it('splits a blob with tokenId and blueprint', async () => {
      const blob = ethers.toUtf8Bytes('{42}:{hello}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(42n)
      expect(ethers.toUtf8String(blueprint)).to.equal('hello')
    })

    it('splits a blob with single digit tokenId', async () => {
      const blob = ethers.toUtf8Bytes('{7}:{blueprint123}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(7n)
      expect(ethers.toUtf8String(blueprint)).to.equal('blueprint123')
    })

    it('splits a blob with large tokenId', async () => {
      const blob = ethers.toUtf8Bytes('{999999}:{data}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(999999n)
      expect(ethers.toUtf8String(blueprint)).to.equal('data')
    })

    it('returns empty blueprint when blueprint is empty', async () => {
      // Format "{42}:{}" => empty blueprint per Minting.split logic
      const blob = ethers.toUtf8Bytes('{42}:{}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(42n)
      expect(blueprint).to.equal('0x')
      expect(ethers.toUtf8String(blueprint)).to.equal('')
    })

    it('handles empty blueprint with "{0}:{}"', async () => {
      const blob = ethers.toUtf8Bytes('{0}:{}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(0n)
      expect(blueprint).to.equal('0x')
    })

    it('reverts when separator is missing', async () => {
      const blob = ethers.toUtf8Bytes('{42 hello}')
      await expect(helper.split(blob)).to.be.revertedWithCustomError(helper, 'SeparatorMustExist')
    })

    it('reverts when tokenId is non-numeric', async () => {
      const blob = ethers.toUtf8Bytes('{abc}:{hello}')
      await expect(helper.split(blob)).to.be.revertedWithCustomError(helper, 'InvalidInput')
    })

    it('reverts when tokenId contains special characters', async () => {
      const blob = ethers.toUtf8Bytes('{12-34}:{hello}')
      await expect(helper.split(blob)).to.be.revertedWithCustomError(helper, 'InvalidInput')
    })

    it('correctly splits tokenId 1 with minimal blueprint', async () => {
      const blob = ethers.toUtf8Bytes('{1}:{a}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(1n)
      expect(ethers.toUtf8String(blueprint)).to.equal('a')
    })

    it('handles zero tokenId with blueprint', async () => {
      const blob = ethers.toUtf8Bytes('{0}:{test}')
      const [tokenId, blueprint] = await helper.split(blob)
      expect(tokenId).to.equal(0n)
      expect(ethers.toUtf8String(blueprint)).to.equal('test')
    })
  })
})
