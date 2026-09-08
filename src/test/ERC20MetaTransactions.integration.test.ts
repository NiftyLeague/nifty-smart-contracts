import { expect } from 'chai'
import { ethers } from '~/hardhat'
import type { ERC20MetaTransactionsTestHelper } from '~/types/typechain'

const META_TRANSACTION_TYPES = {
  MetaTransaction: [
    { name: 'nonce', type: 'uint256' },
    { name: 'from', type: 'address' },
    { name: 'functionSignature', type: 'bytes' },
  ],
}

async function deployToken() {
  const factory = await ethers.getContractFactory('ERC20MetaTransactionsTestHelper')
  return (await factory.deploy()) as unknown as ERC20MetaTransactionsTestHelper
}

async function signMetaTransaction(
  token: ERC20MetaTransactionsTestHelper,
  user: { address: string; signTypedData: typeof ethers.Wallet.prototype.signTypedData },
  functionSignature: string
) {
  const network = await ethers.provider.getNetwork()
  const nonce = await token.getNonce(user.address)
  const signature = await user.signTypedData(
    {
      name: 'Meta Test',
      version: '1',
      chainId: network.chainId,
      verifyingContract: await token.getAddress(),
    },
    META_TRANSACTION_TYPES,
    { nonce, from: user.address, functionSignature }
  )

  return ethers.Signature.from(signature)
}

describe('ERC20 meta transactions', function () {
  it('tracks nonce invalidation independently for each caller', async function () {
    const [, alice, bob] = await ethers.getSigners()
    const token = await deployToken()

    expect(await token.getNonce(alice.address)).to.equal(0n)
    expect(await token.getNonce(bob.address)).to.equal(0n)

    await token.connect(alice).invalidateNext(3)
    await token.connect(alice).invalidateNext(2)

    expect(await token.getNonce(alice.address)).to.equal(5n)
    expect(await token.getNonce(bob.address)).to.equal(0n)
  })

  it('executes a signed transfer using the original user as the sender', async function () {
    const [owner, relayer, recipient] = await ethers.getSigners()
    const token = await deployToken()
    const amount = ethers.parseEther('10')
    const functionSignature = token.interface.encodeFunctionData('transfer', [
      recipient.address,
      amount,
    ])
    const { r, s, v } = await signMetaTransaction(token, owner, functionSignature)

    await token.transfer(recipient.address, amount)
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther('90'))
    expect(await token.balanceOf(recipient.address)).to.equal(amount)

    await expect(
      token.connect(relayer).executeMetaTransaction(owner.address, functionSignature, r, s, v)
    )
      .to.emit(token, 'MetaTransactionExecuted')
      .withArgs(owner.address, relayer.address, functionSignature)

    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther('80'))
    expect(await token.balanceOf(recipient.address)).to.equal(amount * 2n)
    expect(await token.getNonce(owner.address)).to.equal(1n)
  })

  it('rejects invalid signatures and replayed transactions', async function () {
    const [owner, relayer, recipient, attacker] = await ethers.getSigners()
    const token = await deployToken()
    const functionSignature = token.interface.encodeFunctionData('transfer', [
      recipient.address,
      ethers.parseEther('1'),
    ])
    const validSignature = await signMetaTransaction(token, owner, functionSignature)

    await token
      .connect(relayer)
      .executeMetaTransaction(
        owner.address,
        functionSignature,
        validSignature.r,
        validSignature.s,
        validSignature.v
      )

    await expect(
      token
        .connect(relayer)
        .executeMetaTransaction(
          owner.address,
          functionSignature,
          validSignature.r,
          validSignature.s,
          validSignature.v
        )
    ).to.be.revertedWith('Signer and signature do not match')

    const attackerSignature = await signMetaTransaction(token, attacker, functionSignature)
    await expect(
      token
        .connect(relayer)
        .executeMetaTransaction(
          owner.address,
          functionSignature,
          attackerSignature.r,
          attackerSignature.s,
          attackerSignature.v
        )
    ).to.be.revertedWith('Signer and signature do not match')

    await expect(
      token
        .connect(relayer)
        .executeMetaTransaction(owner.address, '0x', ethers.ZeroHash, ethers.ZeroHash, 0)
    ).to.be.revertedWith('Invalid signature')
  })

  it('rejects nested execution and rolls back a failed inner call', async function () {
    const [owner, relayer, recipient] = await ethers.getSigners()
    const token = await deployToken()
    const executeSelector = token.interface.getFunction('executeMetaTransaction')!.selector

    await expect(
      token
        .connect(relayer)
        .executeMetaTransaction(owner.address, executeSelector, ethers.ZeroHash, ethers.ZeroHash, 0)
    ).to.be.revertedWith('functionSignature can not be of executeMetaTransaction method')

    const functionSignature = token.interface.encodeFunctionData('transfer', [
      recipient.address,
      ethers.parseEther('101'),
    ])
    const signature = await signMetaTransaction(token, owner, functionSignature)

    await expect(
      token
        .connect(relayer)
        .executeMetaTransaction(
          owner.address,
          functionSignature,
          signature.r,
          signature.s,
          signature.v
        )
    ).to.be.revertedWith('Function call not successful')

    expect(await token.getNonce(owner.address)).to.equal(0n)
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther('100'))
  })
})
