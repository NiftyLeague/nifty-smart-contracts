import { expect } from 'chai'
import { ethers } from '~/hardhat'
import type { BytesTestHelper } from '~/types/typechain'

describe('Bytes library', function () {
  let helper: BytesTestHelper

  beforeEach(async () => {
    const BytesTestHelper = await ethers.getContractFactory('BytesTestHelper')
    helper = (await BytesTestHelper.deploy()) as unknown as BytesTestHelper
  })

  describe('fromUint', function () {
    it('converts zero to "0"', async () => {
      expect(await helper.fromUint(0)).to.equal('0')
    })

    it('converts a single digit', async () => {
      expect(await helper.fromUint(5)).to.equal('5')
    })

    it('converts a multi-digit number', async () => {
      expect(await helper.fromUint(12345)).to.equal('12345')
    })

    it('converts a large number', async () => {
      expect(await helper.fromUint(1_000_000_000)).to.equal('1000000000')
    })

    it('converts max uint256 without reverting', async () => {
      const result = await helper.fromUint(ethers.MaxUint256)
      expect(result).to.be.a('string')
      expect(result.length).to.be.greaterThan(0)
    })
  })

  describe('indexOf', function () {
    it('finds a character at the start of bytes', async () => {
      const result = await helper.indexOf(ethers.toUtf8Bytes('hello world'), 'h', 0)
      expect(result).to.equal(0n)
    })

    it('finds a character in the middle of bytes', async () => {
      const result = await helper.indexOf(ethers.toUtf8Bytes('hello world'), 'w', 0)
      expect(result).to.equal(6n)
    })

    it('returns -1 when character is not found', async () => {
      const result = await helper.indexOf(ethers.toUtf8Bytes('hello world'), 'z', 0)
      expect(result).to.equal(-1n)
    })

    it('finds a character after a positive offset', async () => {
      const result = await helper.indexOf(ethers.toUtf8Bytes('abcabc'), 'a', 1)
      expect(result).to.equal(3n)
    })

    it('returns -1 when offset is past the character', async () => {
      const result = await helper.indexOf(ethers.toUtf8Bytes('abc'), 'a', 5)
      expect(result).to.equal(-1n)
    })

    it('handles the colon separator character', async () => {
      const result = await helper.indexOf(ethers.toUtf8Bytes('{42:blueprint}'), ':', 0)
      expect(result).to.equal(3n)
    })
  })

  describe('substring', function () {
    it('extracts a substring from the middle', async () => {
      const result = await helper.substring(ethers.toUtf8Bytes('hello world'), 0, 5)
      expect(result).to.equal('hello')
    })

    it('extracts the full string', async () => {
      const result = await helper.substring(ethers.toUtf8Bytes('test'), 0, 4)
      expect(result).to.equal('test')
    })

    it('extracts an empty substring when start equals end', async () => {
      const result = await helper.substring(ethers.toUtf8Bytes('anything'), 3, 3)
      expect(result).to.equal('')
    })

    it('extracts the tail portion', async () => {
      const result = await helper.substring(ethers.toUtf8Bytes('hello world'), 6, 11)
      expect(result).to.equal('world')
    })
  })

  describe('toUint', function () {
    it('converts a simple numeric string', async () => {
      const result = await helper.toUint(ethers.toUtf8Bytes('42'))
      expect(result).to.equal(42n)
    })

    it('converts zero', async () => {
      const result = await helper.toUint(ethers.toUtf8Bytes('0'))
      expect(result).to.equal(0n)
    })

    it('converts a large number', async () => {
      const result = await helper.toUint(ethers.toUtf8Bytes('123456789'))
      expect(result).to.equal(123456789n)
    })

    it('returns 0 for empty bytes', async () => {
      const result = await helper.toUint(ethers.toUtf8Bytes(''))
      expect(result).to.equal(0n)
    })

    it('reverts on non-numeric characters', async () => {
      await expect(helper.toUint(ethers.toUtf8Bytes('12a34'))).to.be.revertedWithCustomError(
        helper,
        'InvalidInput'
      )
    })

    it('reverts on special characters', async () => {
      await expect(helper.toUint(ethers.toUtf8Bytes('12-34'))).to.be.revertedWithCustomError(
        helper,
        'InvalidInput'
      )
    })

    it('reverts on whitespace', async () => {
      await expect(helper.toUint(ethers.toUtf8Bytes(' 42'))).to.be.revertedWithCustomError(
        helper,
        'InvalidInput'
      )
    })
  })
})
