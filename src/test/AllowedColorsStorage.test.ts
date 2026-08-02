import { expect } from 'chai'
import { ethers } from '~/hardhat'

describe('AllowedColorsStorage', function () {
  it('sets and toggles colors for a valid tribe', async function () {
    const storage = await (await ethers.getContractFactory('AllowedColorsStorage')).deploy()

    await storage.setAllowedColorsOnTribe(1, [10, 11], true)
    expect(await storage.isAllowedColor(1, 10)).to.equal(true)
    expect(await storage.isAllowedColor(1, 11)).to.equal(true)

    await storage.setAllowedColorsOnTribe(1, [10], false)
    expect(await storage.isAllowedColor(1, 10)).to.equal(false)
    expect(await storage.isAllowedColor(1, 11)).to.equal(true)
  })

  it('rejects invalid tribes and non-owner writes', async function () {
    const [owner, outsider] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('AllowedColorsStorage')
    const storage = await factory.deploy()

    await expect(storage.setAllowedColorsOnTribe(0, [1], true))
      .to.be.revertedWithCustomError(storage, 'InvalidTribe')
      .withArgs(0, 'Invalid tribe provided')
    await expect(storage.setAllowedColorsOnTribe(10, [1], true))
      .to.be.revertedWithCustomError(storage, 'InvalidTribe')
      .withArgs(10, 'Invalid tribe provided')
    await expect(storage.connect(outsider).setAllowedColorsOnTribe(1, [1], true)).to.revert(ethers)
    expect(await storage.owner()).to.equal(owner.address)
  })
})
