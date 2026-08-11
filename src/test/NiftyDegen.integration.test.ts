import { expect } from 'chai'
import { ethers } from '~/hardhat'
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

interface Combo {
  character: Character
  head: Head
  clothing: Clothing
  accessories: Accessories
  items: Items
}

// Canonical trait combos sourced from CHARACTER_TRAITS_MAP (src/constants/degens.ts)
const COMBO1: Combo = {
  character: [1, 17, 73, 104, 110],
  head: [0, 263, 0],
  clothing: [0, 0, 0, 0, 685, 0],
  accessories: [717, 0, 0, 821, 824, 865],
  items: [894, 991],
}
const COMBO2: Combo = {
  character: [3, 29, 82, 101, 0],
  head: [0, 0, 0],
  clothing: [0, 0, 0, 0, 0, 0],
  accessories: [0, 0, 0, 0, 0, 0],
  items: [0, 0],
}
const COMBO3: Combo = {
  character: [5, 48, 90, 107, 110],
  head: [0, 0, 0],
  clothing: [0, 0, 0, 0, 0, 0],
  accessories: [0, 0, 0, 0, 0, 0],
  items: [0, 0],
}
const COMBO4: Combo = {
  character: [1, 10, 70, 101, 110],
  head: [0, 0, 0],
  clothing: [0, 0, 0, 0, 0, 0],
  accessories: [0, 0, 0, 0, 0, 0],
  items: [0, 0],
}
const COMBO5: Combo = {
  character: [6, 67, 0, 103, 0],
  head: [0, 263, 0],
  clothing: [373, 439, 0, 622, 672, 695],
  accessories: [0, 0, 0, 820, 0, 0],
  items: [0, 0],
}
const COMBO6: Combo = {
  character: [6, 59, 0, 101, 0],
  head: [0, 0, 0],
  clothing: [0, 0, 0, 0, 0, 0],
  accessories: [0, 0, 0, 0, 0, 0],
  items: [0, 0],
}

describe('NiftyDegen', function () {
  let owner: Signer
  let bob: Signer
  let nftl: MockERC20
  let colorsStorage: AllowedColorsStorage
  let degen: NiftyDegen

  const BASE_URI = 'https://api.niftyleague.com/sepolia/degen/metadata/'

  before(async () => {
    await resetLocalNetwork()
    ;[owner, bob] = await ethers.getSigners()

    nftl = await deployMockERC20()

    const AllowedColorsStorage = await ethers.getContractFactory('AllowedColorsStorage')
    colorsStorage = (await AllowedColorsStorage.deploy()) as AllowedColorsStorage

    // Allow canonical colors for the tribes exercised by the test combos
    await colorsStorage.setAllowedColorsOnTribe(1, ALLOWED_COLORS[0], true) // APE
    await colorsStorage.setAllowedColorsOnTribe(3, ALLOWED_COLORS[2], true) // DOGE
    await colorsStorage.setAllowedColorsOnTribe(5, ALLOWED_COLORS[4], true) // CAT
    await colorsStorage.setAllowedColorsOnTribe(6, ALLOWED_COLORS[5], true) // ALIEN

    const NiftyDegen = await ethers.getContractFactory('NiftyDegen')
    degen = (await NiftyDegen.deploy(
      await nftl.getAddress(),
      await colorsStorage.getAddress()
    )) as unknown as NiftyDegen

    await degen.initPoolSizes()
  })

  describe('Deployment', function () {
    it('Should deploy with the correct metadata', async function () {
      expect(await degen.name()).to.equal('NiftyDegen')
      expect(await degen.symbol()).to.equal('DEGEN')
      expect(await degen.MAX_SUPPLY()).to.equal(10000)
      expect(await degen.SPECIAL_CHARACTERS()).to.equal(100)
      expect(await degen.NAME_CHANGE_PRICE()).to.equal(ethers.parseEther('1000'))
      expect(await degen.totalSupply()).to.equal(0)
      expect(await degen.owner()).to.equal(await owner.getAddress())
    })

    it('Should revert with an invalid storage address', async function () {
      const NiftyDegen = await ethers.getContractFactory('NiftyDegen')
      await expect(
        NiftyDegen.deploy(await nftl.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid storage address')
    })

    it('Should revert with an invalid NFTL token address', async function () {
      const NiftyDegen = await ethers.getContractFactory('NiftyDegen')
      await expect(
        NiftyDegen.deploy(ethers.ZeroAddress, await colorsStorage.getAddress())
      ).to.be.revertedWith('Invalid NFTL token address')
    })
  })

  describe('Owner-only functions', function () {
    it('Should only allow the owner to initialize pool sizes', async function () {
      await expect(degen.connect(bob).initPoolSizes()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Should only allow the owner to override the mint price', async function () {
      await expect(degen.connect(bob).overrideMintPrice(1)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Should only allow the owner to set the base URI', async function () {
      await expect(degen.connect(bob).setBaseURI(BASE_URI)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })
  })

  describe('getNFTPrice', function () {
    it('Should be free for the owner', async function () {
      expect(await degen.getNFTPrice()).to.equal(0)
    })

    it('Should return 0.1 ETH for the public when supply is below 1000', async function () {
      expect(await degen.connect(bob).getNFTPrice()).to.equal(ethers.parseEther('0.1'))
    })

    it('Should honor an override at or above the 0.08 ETH floor', async function () {
      await expect(degen.overrideMintPrice(ethers.parseEther('0.08')))
        .to.emit(degen, 'PriceChanged')
        .withArgs(ethers.parseEther('0.08'))
      expect(await degen.connect(bob).getNFTPrice()).to.equal(ethers.parseEther('0.08'))
    })

    it('Should ignore an override below the 0.08 ETH floor', async function () {
      await degen.overrideMintPrice(ethers.parseEther('0.05'))
      expect(await degen.connect(bob).getNFTPrice()).to.equal(ethers.parseEther('0.1'))
      // Reset the manual price so later purchases use the standard ladder
      await degen.overrideMintPrice(0)
      expect(await degen.connect(bob).getNFTPrice()).to.equal(ethers.parseEther('0.1'))
    })
  })

  describe('purchase validation', function () {
    it('Should revert for non-owners before the sale starts', async function () {
      await expect(
        degen
          .connect(bob)
          .purchase(
            COMBO4.character,
            COMBO4.head,
            COMBO4.clothing,
            COMBO4.accessories,
            COMBO4.items,
            { value: ethers.parseEther('0.1') }
          )
      ).to.be.revertedWith('Sale has not started')
    })

    it('Should revert if the ether value is incorrect', async function () {
      await expect(
        degen.purchase(
          COMBO1.character,
          COMBO1.head,
          COMBO1.clothing,
          COMBO1.accessories,
          COMBO1.items,
          { value: 1 }
        )
      ).to.be.revertedWith('Ether value incorrect')
    })

    it('Should revert with an incorrect tribe', async function () {
      const invalid: Combo = { ...COMBO1, character: [0, 17, 73, 104, 110] }
      await expect(
        degen.purchase(
          invalid.character,
          invalid.head,
          invalid.clothing,
          invalid.accessories,
          invalid.items
        )
      ).to.be.revertedWith('Tribe incorrect')
    })

    it('Should revert with out-of-range skin color', async function () {
      const invalid: Combo = { ...COMBO1, character: [1, 1, 73, 104, 110] }
      await expect(
        degen.purchase(
          invalid.character,
          invalid.head,
          invalid.clothing,
          invalid.accessories,
          invalid.items
        )
      ).to.be.revertedWith('Skin color incorrect')
    })

    it('Should revert when a color is not allowed for the tribe', async function () {
      const invalid: Combo = { ...COMBO1, character: [1, 22, 73, 104, 110] }
      await expect(
        degen.purchase(
          invalid.character,
          invalid.head,
          invalid.clothing,
          invalid.accessories,
          invalid.items
        )
      ).to.be.revertedWith('Skin color unavailable')
    })

    it('Should revert with out-of-range head trait', async function () {
      const invalid: Combo = { ...COMBO1, head: [300, 263, 0] }
      await expect(
        degen.purchase(
          invalid.character,
          invalid.head,
          invalid.clothing,
          invalid.accessories,
          invalid.items
        )
      ).to.be.revertedWith('Hair incorrect')
    })
  })

  describe('purchase', function () {
    it('Should allow the owner to mint the first characters for free', async function () {
      const ownerAddress = await owner.getAddress()
      await expect(
        degen.purchase(
          COMBO1.character,
          COMBO1.head,
          COMBO1.clothing,
          COMBO1.accessories,
          COMBO1.items
        )
      )
        .to.emit(degen, 'Transfer')
        .withArgs(ethers.ZeroAddress, ownerAddress, 1)
      await expect(
        degen.purchase(
          COMBO2.character,
          COMBO2.head,
          COMBO2.clothing,
          COMBO2.accessories,
          COMBO2.items
        )
      )
        .to.emit(degen, 'Transfer')
        .withArgs(ethers.ZeroAddress, ownerAddress, 2)
      await expect(
        degen.purchase(
          COMBO3.character,
          COMBO3.head,
          COMBO3.clothing,
          COMBO3.accessories,
          COMBO3.items
        )
      )
        .to.emit(degen, 'Transfer')
        .withArgs(ethers.ZeroAddress, ownerAddress, 3)

      expect(await degen.totalSupply()).to.equal(3)
      expect(await degen.balanceOf(ownerAddress)).to.equal(3)
    })

    it('Should let the public mint once the sale starts', async function () {
      const bobAddress = await bob.getAddress()
      await expect(
        degen
          .connect(bob)
          .purchase(
            COMBO4.character,
            COMBO4.head,
            COMBO4.clothing,
            COMBO4.accessories,
            COMBO4.items,
            { value: ethers.parseEther('0.1') }
          )
      )
        .to.emit(degen, 'Transfer')
        .withArgs(ethers.ZeroAddress, bobAddress, 4)

      expect(await degen.totalSupply()).to.equal(4)
      expect(await degen.balanceOf(bobAddress)).to.equal(1)
      expect(await degen.ownerOf(4)).to.equal(bobAddress)
    })

    it('Should reject tribes above 6 for the public', async function () {
      const invalid: Combo = { ...COMBO1, character: [7, 17, 73, 104, 110] }
      await expect(
        degen
          .connect(bob)
          .purchase(
            invalid.character,
            invalid.head,
            invalid.clothing,
            invalid.accessories,
            invalid.items,
            { value: ethers.parseEther('0.1') }
          )
      ).to.be.revertedWith('Tribe incorrect')
    })

    it('Should reject a trait combo that already exists', async function () {
      await expect(
        degen
          .connect(bob)
          .purchase(
            COMBO1.character,
            COMBO1.head,
            COMBO1.clothing,
            COMBO1.accessories,
            COMBO1.items,
            { value: ethers.parseEther('0.1') }
          )
      ).to.be.revertedWith('NFT trait combo already exists')
    })
  })

  describe('tokenURI', function () {
    it('Should return an empty string before a base URI is set', async function () {
      expect(await degen.tokenURI(1)).to.equal('')
    })

    it('Should append the token id to the base URI after setBaseURI', async function () {
      await degen.setBaseURI(BASE_URI)
      expect(await degen.tokenURI(1)).to.equal(`${BASE_URI}1`)
    })
  })

  describe('getCharacterTraits', function () {
    it('Should unpack the stored traits for a token', async function () {
      const traits = await degen.getCharacterTraits(1)
      expect(traits.tribe).to.equal(1)
      expect(traits.skinColor).to.equal(17)
      expect(traits.furColor).to.equal(73)
      expect(traits.eyeColor).to.equal(104)
      expect(traits.pupilColor).to.equal(110)
      expect(traits.hair).to.equal(0)
      expect(traits.mouth).to.equal(263)
      expect(traits.footwear).to.equal(685)
      expect(traits.hat).to.equal(717)
      expect(traits.wrist).to.equal(821)
      expect(traits.hands).to.equal(824)
      expect(traits.neckwear).to.equal(865)
      expect(traits.leftItem).to.equal(894)
      expect(traits.rightItem).to.equal(991)
    })

    it('Should revert for a nonexistent token', async function () {
      await expect(degen.getCharacterTraits(999)).to.be.revertedWith('nonexistent token')
    })
  })

  describe('changeName', function () {
    it('Should reject a name change from a non-owner', async function () {
      await expect(degen.changeName(4, 'Steal'))
        .to.be.revertedWithCustomError(degen, 'NameError')
        .withArgs('Caller is not owner nor approved')
    })

    it('Should reject a name change for a nonexistent token', async function () {
      await expect(degen.changeName(999, 'Ghost'))
        .to.be.revertedWithCustomError(degen, 'NameError')
        .withArgs('nonexistent token')
    })

    it('Should validate names', async function () {
      expect(await degen.validateName('BobDegen')).to.be.true
      expect(await degen.validateName('bob1')).to.be.true
      expect(await degen.validateName('a')).to.be.true
      expect(await degen.validateName('')).to.be.false
      expect(await degen.validateName(' Bob')).to.be.false
      expect(await degen.validateName('Bob ')).to.be.false
      expect(await degen.validateName('Bo  b')).to.be.false
      expect(await degen.validateName('Bob!')).to.be.false
      expect(await degen.validateName('a'.repeat(33))).to.be.false
    })

    it('Should change the name for NAME_CHANGE_PRICE NFTL', async function () {
      const bobAddress = await bob.getAddress()
      const price = await degen.NAME_CHANGE_PRICE()
      await nftl.mint(bobAddress, price)
      await nftl.connect(bob).approve(await degen.getAddress(), price)

      await expect(degen.connect(bob).changeName(4, 'BobDegen'))
        .to.emit(degen, 'NameUpdated')
        .withArgs(4, '', 'BobDegen')

      expect(await degen.getName(4)).to.equal('BobDegen')
      expect(await degen.isNameReserved('bobdegen')).to.be.true
      expect(await nftl.balanceOf(bobAddress)).to.equal(0)
    })

    it('Should reject reusing the current name', async function () {
      await expect(degen.connect(bob).changeName(4, 'BobDegen'))
        .to.be.revertedWithCustomError(degen, 'NameError')
        .withArgs('New name and old name are equal')
    })

    it('Should reject a reserved name case-insensitively', async function () {
      await expect(degen.connect(bob).changeName(4, 'BOBDEGEN'))
        .to.be.revertedWithCustomError(degen, 'NameError')
        .withArgs('Name already reserved')
    })

    it('Should reject an invalid name', async function () {
      await expect(degen.connect(bob).changeName(4, 'bad name!'))
        .to.be.revertedWithCustomError(degen, 'NameError')
        .withArgs('Name is not allowed')
    })
  })

  describe('pause/unpause', function () {
    it('Should let the public mint a different tribe', async function () {
      await expect(
        degen
          .connect(bob)
          .purchase(
            COMBO5.character,
            COMBO5.head,
            COMBO5.clothing,
            COMBO5.accessories,
            COMBO5.items,
            { value: ethers.parseEther('0.1') }
          )
      )
        .to.emit(degen, 'Transfer')
        .withArgs(ethers.ZeroAddress, await bob.getAddress(), 5)
    })

    it('Should block purchases while paused', async function () {
      await degen.pauseMinting()
      expect(await degen.paused()).to.be.true
      await expect(
        degen
          .connect(bob)
          .purchase(
            COMBO6.character,
            COMBO6.head,
            COMBO6.clothing,
            COMBO6.accessories,
            COMBO6.items,
            { value: ethers.parseEther('0.1') }
          )
      ).to.be.revertedWith('Pausable: paused')
    })

    it('Should resume purchases after unpausing', async function () {
      await degen.unpauseMinting()
      expect(await degen.paused()).to.be.false
      await expect(
        degen
          .connect(bob)
          .purchase(
            COMBO6.character,
            COMBO6.head,
            COMBO6.clothing,
            COMBO6.accessories,
            COMBO6.items,
            { value: ethers.parseEther('0.1') }
          )
      )
        .to.emit(degen, 'Transfer')
        .withArgs(ethers.ZeroAddress, await bob.getAddress(), 6)
    })
  })

  describe('trait availability', function () {
    it('Should track removed traits and availability', async function () {
      // No removals have been attempted before token 7
      expect(await degen.getRemovedTraits()).to.deep.equal([])
      expect(await degen.isAvailableTrait(200)).to.be.true
      expect(await degen.isUnique(999999)).to.be.true
      // COMBO1 was minted as token 1; its packed trait combo must no longer be unique
      const packedCombo =
        1n |
        (17n << 10n) |
        (73n << 20n) |
        (104n << 30n) |
        (110n << 40n) |
        (263n << 60n) |
        (685n << 120n) |
        (717n << 140n) |
        (821n << 170n) |
        (824n << 180n) |
        (865n << 190n) |
        (894n << 200n) |
        (991n << 210n)
      expect(await degen.isUnique(packedCombo)).to.be.false
    })

    it('Should check allowed colors against the storage contract', async function () {
      expect(await degen.isAvailableAndAllowedTrait(1, 0)).to.be.true // empty trait
      expect(await degen.isAvailableAndAllowedTrait(1, 10)).to.be.true // APE skin
      expect(await degen.isAvailableAndAllowedTrait(1, 22)).to.be.false // HUMAN color
      expect(await degen.isAvailableAndAllowedTrait(1, 300)).to.be.true // trait >= 150
    })
  })

  describe('withdraw', function () {
    it('Should only allow the owner to withdraw', async function () {
      await expect(degen.connect(bob).withdraw()).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('Should withdraw the collected ether to the owner', async function () {
      const ownerAddress = await owner.getAddress()
      const balanceBefore = await ethers.provider.getBalance(ownerAddress)
      expect(await ethers.provider.getBalance(await degen.getAddress())).to.equal(
        ethers.parseEther('0.3')
      )

      await degen.withdraw()

      expect(await ethers.provider.getBalance(await degen.getAddress())).to.equal(0)
      expect(await ethers.provider.getBalance(ownerAddress)).to.be.gt(balanceBefore)
    })
  })
})
