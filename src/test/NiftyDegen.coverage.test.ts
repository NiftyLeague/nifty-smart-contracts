import { expect } from 'chai'
import { ethers, network, time } from '~/hardhat'
import type { Signer } from 'ethers'
import type { AllowedColorsStorage, MockERC20, NiftyDegen } from '~/types/typechain'

import { ALLOWED_COLORS } from '~/constants/allowedColors'
import { deployMockERC20 } from './utils/contracts'
import { resetLocalNetwork } from './utils/network'

type Character = [number, number, number, number, number]
type Head = [number, number, number]
type Clothing = [number, number, number, number, number, number]
type Accessories = [number, number, number, number, number, number]
type Items = [number, number]

const APE_SKIN = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
const APE_FUR = [70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81]
const APE_EYE = [101, 102, 103, 104, 105, 106, 107, 108, 109]
const APE_PUPIL = [110, 111, 112, 113, 114, 115, 116, 117, 118]

const DOGE_SKIN = [29, 30, 31, 32, 33, 34, 35, 36]
const DOGE_FUR = [82, 83, 84, 85, 86, 87, 88, 89]
const DOGE_EYE = [101, 102, 103, 104, 105, 106, 107, 108, 109]
const DOGE_PUPIL = [110, 111, 112, 113, 114, 115, 116, 117, 118]

describe('NiftyDegen coverage', function () {
  let owner: Signer
  let bob: Signer
  let nftl: MockERC20
  let colorsStorage: AllowedColorsStorage
  let degen: NiftyDegen

  before(async () => {
    await resetLocalNetwork()
    ;[owner, bob] = await ethers.getSigners()

    nftl = await deployMockERC20()

    const AllowedColorsStorage = await ethers.getContractFactory('AllowedColorsStorage')
    colorsStorage = (await AllowedColorsStorage.deploy()) as AllowedColorsStorage

    for (let i = 0; i < ALLOWED_COLORS.length; i++) {
      await colorsStorage.setAllowedColorsOnTribe(i + 1, ALLOWED_COLORS[i], true)
    }

    const NiftyDegen = await ethers.getContractFactory('NiftyDegen')
    degen = (await NiftyDegen.deploy(
      await nftl.getAddress(),
      await colorsStorage.getAddress()
    )) as unknown as NiftyDegen

    await degen.initPoolSizes()
  })

  describe('_removeRandomTrait', function () {
    it('Should remove a random trait when conditions are met', async function () {
      // Mint enough tokens to ensure _removeRandomTrait triggers at least once
      // tokenId % 7 == 0 triggers the check, and _rngSkip has ~50% chance to return false
      // Using combos with non-zero traits at positions 5-21 increases removal probability
      let attempts = 0
      const maxAttempts = 200
      while ((await degen.getRemovedTraits()).length === 0 && attempts < maxAttempts) {
        const i = attempts
        const skinIdx = i % DOGE_SKIN.length
        const mouthIdx = Math.floor(i / DOGE_SKIN.length) % 14
        try {
          await degen.purchase(
            [3, DOGE_SKIN[skinIdx], DOGE_FUR[0], DOGE_EYE[0], 0] as Character,
            [0, 263 + mouthIdx, 0] as Head,
            [0, 0, 0, 0, 685, 0] as Clothing,
            [707, 0, 0, 821, 824, 865] as Accessories,
            [894, 991] as Items,
            { value: 0 }
          )
        } catch (err: any) {
          if (err.message.includes('unavailable')) {
            // Trait was removed, check if we have removals now
            continue
          }
          throw err
        }
        attempts++
      }

      // Verify at least one trait was removed
      const removedTraits = await degen.getRemovedTraits()
      expect(removedTraits.length).to.be.gt(0)
      // Verify the removed trait is unavailable
      expect(await degen.isAvailableTrait(removedTraits[0])).to.be.false
    })
  })

  describe('getNFTPrice', function () {
    it('Should return 0.13 ETH when supply reaches 1000', async function () {
      let minted = 0
      for (const skin of APE_SKIN) {
        for (const fur of APE_FUR) {
          for (const eye of APE_EYE) {
            for (const pupil of APE_PUPIL) {
              if (minted >= 1000) break
              await degen.purchase(
                [1, skin, fur, eye, pupil] as Character,
                [0, 0, 0] as Head,
                [0, 0, 0, 0, 0, 0] as Clothing,
                [0, 0, 0, 0, 0, 0] as Accessories,
                [0, 0] as Items,
                { value: 0 }
              )
              minted++
            }
            if (minted >= 1000) break
          }
          if (minted >= 1000) break
        }
        if (minted >= 1000) break
      }
      expect(await degen.connect(bob).getNFTPrice()).to.equal(ethers.parseEther('0.13'))
    })
  })
})
