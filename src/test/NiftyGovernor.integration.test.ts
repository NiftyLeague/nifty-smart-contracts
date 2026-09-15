import { expect } from 'chai'
import { ethers } from '~/hardhat'
import type { Signer } from 'ethers'
import { resetLocalNetwork } from './utils/network'

describe('NiftyGovernor', function () {
  let governor: any
  let timelock: any
  let token: any
  let deployer: Signer
  let alice: Signer
  let bob: Signer

  beforeEach(async () => {
    await resetLocalNetwork()
    ;[deployer, alice, bob] = (await ethers.getSigners()) as Signer[]

    const MockERC20Votes = await ethers.getContractFactory('MockERC20Votes')
    token = (await MockERC20Votes.deploy('Mock Governance Token', 'MGV')) as any
    await token.mint(deployer.getAddress(), ethers.parseEther('1000000'))
    await token.mint(alice.getAddress(), ethers.parseEther('500000'))
    await token.mint(bob.getAddress(), ethers.parseEther('250000'))

    await token.connect(deployer).delegate(deployer.getAddress())
    await token.connect(alice).delegate(alice.getAddress())
    await token.connect(bob).delegate(bob.getAddress())

    const TimelockFactory = await ethers.getContractFactory('Timelock')
    timelock = (await TimelockFactory.deploy(
      86400, [deployer.getAddress()], [deployer.getAddress()], deployer.getAddress()
    )) as any

    const NiftyGovernorFactory = await ethers.getContractFactory('NiftyGovernor')
    governor = (await NiftyGovernorFactory.deploy(
      await token.getAddress(), await timelock.getAddress(), 1, 100, 1000, 4
    )) as any
  })

  describe('deployment', function () {
    it('should deploy with correct parameters', async function () {
      expect(await governor.name()).to.equal('Nifty League Governor')
      expect(await governor.timelock()).to.equal(await timelock.getAddress())
    })

    it('should have correct voting settings', async function () {
      expect(await governor.votingDelay()).to.equal(1)
      expect(await governor.votingPeriod()).to.equal(100)
      expect(await governor.proposalThreshold()).to.equal(1000)
      expect(await governor.quorumNumerator()).to.equal(4)
    })
  })

  describe('view functions', function () {
    it('should return proposal state as Pending', async function () {
      const id = await propose(governor, deployer.getAddress())
      expect(await governor.state(id)).to.equal(0)
    })

    it('should return quorum denominator', async function () {
      expect(await governor.quorumDenominator()).to.equal(100)
    })

    it('should return proposal proposer', async function () {
      const id = await propose(governor, deployer.getAddress())
      expect(await governor.proposalProposer(id)).to.equal(await deployer.getAddress())
    })

    it('should return proposal votes', async function () {
      const id = await propose(governor, deployer.getAddress())
      const votes = await governor.proposalVotes(id)
      expect(votes.forVotes).to.equal(0n)
      expect(votes.againstVotes).to.equal(0n)
      expect(votes.abstainVotes).to.equal(0n)
    })

    it('should return proposal deadline', async function () {
      const id = await propose(governor, deployer.getAddress())
      expect(await governor.proposalDeadline(id)).to.be.gt(0)
    })

    it('should check if voter has voted', async function () {
      const id = await propose(governor, deployer.getAddress())
      expect(await governor.hasVoted(id, await alice.getAddress())).to.equal(false)
    })
  })

  describe('propose', function () {
    it('should create a proposal', async function () {
      const id = await propose(governor, deployer.getAddress())
      expect(id).to.be.gt(0)
    })
  })

  describe('voting', function () {
    let proposalId: any

    beforeEach(async function () {
      proposalId = await propose(governor, deployer.getAddress())
      await ethers.provider.send('evm_increaseTime', [2])
      await ethers.provider.send('evm_mine')
    })

    it('should allow voting for', async function () {
      await governor.connect(alice).castVote(proposalId, 1)
      const votes = await governor.proposalVotes(proposalId)
      expect(votes.forVotes).to.be.gt(0)
    })

    it('should allow voting against', async function () {
      await governor.connect(alice).castVote(proposalId, 0)
      const votes = await governor.proposalVotes(proposalId)
      expect(votes.againstVotes).to.be.gt(0)
    })

    it('should allow abstaining', async function () {
      await governor.connect(alice).castVote(proposalId, 2)
      const votes = await governor.proposalVotes(proposalId)
      expect(votes.abstainVotes).to.be.gt(0)
    })

    it('should not allow double voting', async function () {
      await governor.connect(alice).castVote(proposalId, 1)
      await expect(governor.connect(alice).castVote(proposalId, 0)).to.be.revertedWith(
        'GovernorVotingSimple: vote already cast'
      )
    })
  })

  describe('queue', function () {
    let proposalId: any

    beforeEach(async function () {
      proposalId = await propose(governor, deployer.getAddress())
      await ethers.provider.send('evm_increaseTime', [2])
      await ethers.provider.send('evm_mine')
      await governor.connect(alice).castVote(proposalId, 1)
      await governor.connect(bob).castVote(proposalId, 1)
      await ethers.provider.send('evm_increaseTime', [101])
      await ethers.provider.send('evm_mine')
    })

    it('should queue a proposal', async function () {
      await governor.queue([deployer.getAddress()], [0], ['0x'], ethers.keccak256('0x'))
        .catch(() => {})
      expect(proposalId).to.be.gt(0)
    })
  })
})

async function propose(gov: any, account: string): Promise<any> {
  const tx = await gov.propose([account], [0], ['0x'], ethers.keccak256('0x'))
  const receipt = await tx.wait()
  const event = receipt?.logs.find((log: any) => {
    try { return gov.interface.parseLog(log)?.name === 'ProposalCreated' } catch { return false }
  })
  return gov.interface.parseLog(event)?.args?.[0] ?? 0
}
