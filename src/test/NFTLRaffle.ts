import { expect } from 'chai';
import { ethers, upgrades, network } from 'hardhat';
import { BigNumberish, type Block, type Signer } from 'ethers';

import type {
  NFTLRaffle,
  MockERC20,
  MockERC721,
  VRFCoordinatorV2Interface,
  LinkTokenInterface,
} from '~/types/typechain';

const getCurrentBlockTimestamp = async (): Promise<bigint> => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = (await ethers.provider.getBlock(blockNumber)) as Block;
  return BigInt(block.timestamp);
};

const toBytes32 = (bn: bigint) => {
  return ethers.toBeHex(ethers.zeroPadValue(ethers.toBeHex(bn), 32));
};

const getAccountToken = async (amount: bigint, userAddress: string, tokenAddress: string, slot: number) => {
  // Get storage slot index
  const index = ethers.solidityPackedKeccak256(
    ['uint256', 'uint256'],
    [userAddress, slot], // key, slot
  );

  await ethers.provider.send('hardhat_setStorageAt', [tokenAddress, index, toBytes32(amount).toString()]);
  await ethers.provider.send('evm_mine', []); // Just mines to the next block
};

const impersonate = async (addr: string, fund = true): Promise<Signer> => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [addr],
  });

  if (fund) {
    // Give the account 10 Ether
    await network.provider.request({
      method: 'hardhat_setBalance',
      params: [addr, '0x8AC7230489E80000'],
    });
  }

  return ethers.provider.getSigner(addr);
};

describe.skip('NFTLRaffle', function () {
  let accounts: Signer[];
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let john: Signer;
  let nftlRaffle: NFTLRaffle;
  let nftlToken: MockERC20;
  let prizeNFT: MockERC721;
  let vrfCoordinator: VRFCoordinatorV2Interface;
  let linkToken: LinkTokenInterface;

  const pendingPeriod = 86400 * 2; // 2 days
  const totalWinnerTicketCount = 5;
  const nftlAmountPerTicket = ethers.parseEther('1000');
  const initialNFTLAmount = nftlAmountPerTicket * 1000n;

  const ZERO_ADDRESS = ethers.ZeroAddress;
  const VRF_COORDINATOR_ADDRESS = '0x271682DEB8C4E0901D1a1550aD2e64D568E69909';
  const LINK_TOKEN_ADDRESS = '0x514910771AF9Ca656af840dff83E8264EcF986CA';

  before(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
          },
        },
      ],
    });
  });

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, john] = accounts;

    // deploy MockERC20 contract
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    nftlToken = (await MockERC20.deploy()) as unknown as MockERC20;

    // deploy MockERC721 contract
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    prizeNFT = (await MockERC721.deploy()) as unknown as MockERC721;

    // get VRFCoordinatorV2 contract
    vrfCoordinator = await ethers.getContractAt('VRFCoordinatorV2Interface', VRF_COORDINATOR_ADDRESS);

    // get Link contract
    linkToken = await ethers.getContractAt('LinkTokenInterface', LINK_TOKEN_ADDRESS);

    // deploy NFTLRaffle contract
    const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
    nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
      await nftlToken.getAddress(),
      pendingPeriod,
      totalWinnerTicketCount,
      await prizeNFT.getAddress(),
      await vrfCoordinator.getAddress(),
    ])) as unknown as NFTLRaffle;

    // mint NFTL tokens
    await nftlToken.mint(await alice.getAddress(), initialNFTLAmount);
    await nftlToken.mint(await bob.getAddress(), initialNFTLAmount);
    await nftlToken.mint(await john.getAddress(), initialNFTLAmount);

    // mint Prize NFTs
    for (let i = 0; i < 10; i++) {
      await prizeNFT.mint(await deployer.getAddress());
    }

    // fund LINK tokens
    await getAccountToken(ethers.parseEther('100'), await deployer.getAddress(), LINK_TOKEN_ADDRESS, 1);

    // allow deposit
    await nftlRaffle.allowUserDeposit();
  });

  describe('Initialize', () => {
    it('Should be able to initialize the contract', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
        await nftlToken.getAddress(),
        pendingPeriod,
        totalWinnerTicketCount,
        await prizeNFT.getAddress(),
        await vrfCoordinator.getAddress(),
      ])) as unknown as NFTLRaffle;
    });

    it('Should revert if the NFTL contract address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          ZERO_ADDRESS,
          pendingPeriod,
          totalWinnerTicketCount,
          await prizeNFT.getAddress(),
          await vrfCoordinator.getAddress(),
        ]),
      ).to.be.revertedWith('Zero address');
    });

    it('Should revert if the pendign period is not greater than 1 day', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          await nftlToken.getAddress(),
          86400,
          totalWinnerTicketCount,
          await prizeNFT.getAddress(),
          await vrfCoordinator.getAddress(),
        ]),
      ).to.be.revertedWith('1 day +');
    });

    it('Should revert if the totalWinnerTicketCount is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          await nftlToken.getAddress(),
          pendingPeriod,
          0,
          await prizeNFT.getAddress(),
          await vrfCoordinator.getAddress(),
        ]),
      ).to.be.revertedWith('Zero winner ticket count');
    });

    it('Should revert if the prize NFT address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          await nftlToken.getAddress(),
          pendingPeriod,
          totalWinnerTicketCount,
          ZERO_ADDRESS,
          await vrfCoordinator.getAddress(),
        ]),
      ).to.be.revertedWith('Zero address');
    });

    it('Should revert if the VRF coordinator address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          await nftlToken.getAddress(),
          pendingPeriod,
          totalWinnerTicketCount,
          await prizeNFT.getAddress(),
          ZERO_ADDRESS,
        ]),
      ).to.be.revertedWith('Zero address');
    });
  });

  describe('depositPrizeNFT', () => {
    it('Should be able the deposit the prize NFT', async () => {
      const tokenIds = [1, 3, 5, 6, 9];
      await prizeNFT.setApprovalForAll(await nftlRaffle.getAddress(), true);
      await nftlRaffle.depositPrizeNFT(tokenIds);
    });

    it('Should revert if the prize NFT count is not the same as the winner ticket count', async () => {
      const tokenIds = [1, 3, 5, 9];
      await expect(nftlRaffle.depositPrizeNFT(tokenIds)).to.be.revertedWith('Mismatched prize count');
    });

    it('Should revert if the caller is not the owner', async () => {
      const tokenIds = [1, 3, 5, 6, 9];
      await expect(nftlRaffle.connect(alice).depositPrizeNFT(tokenIds)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('chargeLINK', () => {
    it('Should be able to charge LINK tokens', async () => {
      let linkTokenBalanceBefore = await linkToken.balanceOf(await deployer.getAddress());

      // charge LINK tokens
      const linkTokenAmountToCharge = ethers.parseEther('10');
      await linkToken.approve(await nftlRaffle.getAddress(), linkTokenAmountToCharge);
      await nftlRaffle.chargeLINK(linkTokenAmountToCharge);

      expect(await linkToken.balanceOf(await deployer.getAddress())).to.equal(
        linkTokenBalanceBefore - linkTokenAmountToCharge,
      );
    });
  });

  describe('manageConsumers', () => {
    it('Should be able to add/remove the consumers', async () => {
      await nftlRaffle.manageConsumers(await nftlRaffle.getAddress(), true);
      await nftlRaffle.manageConsumers(await nftlRaffle.getAddress(), false);
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).manageConsumers(await nftlRaffle.getAddress(), true)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      await expect(nftlRaffle.connect(alice).manageConsumers(await nftlRaffle.getAddress(), false)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('distributeTicketsToCitadelKeyHolders', () => {
    beforeEach(async () => {
      // deposit tokens
      let nftlAmountToDeposit = nftlAmountPerTicket * 100n;
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 100
    });

    it('Shoud be able to distribute tickets to CitadelKey holders', async () => {
      // distribute tickets
      const holders = [await alice.getAddress(), await bob.getAddress()];
      const keyCount = [1, 1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount); // 200, 100

      let aliceDepositBefore = await nftlRaffle.userDeposits(await alice.getAddress());
      let bobDepositBefore = await nftlRaffle.userDeposits(await bob.getAddress());
      expect(aliceDepositBefore).to.equal(nftlAmountPerTicket * 200n);
      expect(bobDepositBefore).to.equal(nftlAmountPerTicket * 100n);

      // Alice deposits after distributing tickets
      let nftlAmountToDeposit = (nftlAmountPerTicket * 2n + nftlAmountPerTicket) / 2n; // x2.5
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 202.5, 100

      expect(await nftlRaffle.userDeposits(await alice.getAddress())).to.equal(
        (nftlAmountPerTicket * 202n + nftlAmountPerTicket) / 2n,
      );
      expect(await nftlRaffle.userDeposits(await bob.getAddress())).to.equal(nftlAmountPerTicket * 100n);

      // Check the user status
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner
      expect(await nftlRaffle.getUserCount()).to.equal(2); // Alice, Bob
      expect(await nftlRaffle.getUserList()).to.deep.equal([await alice.getAddress(), await bob.getAddress()]); // Alice, Bob
      expect(await nftlRaffle.totalTicketCount()).to.equal(0);
    });

    it('Should revert if the holder params are invalid', async () => {
      const holders = [await alice.getAddress(), await bob.getAddress()];
      const keyCount = [1, 1, 1];
      await expect(nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount)).to.be.revertedWith(
        'Invalid params',
      );
    });

    it('Should revert if deposit is disallowed', async () => {
      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // distribute tickets
      const holders = [await alice.getAddress(), await bob.getAddress()];
      const keyCount = [1, 1, 1];
      await expect(nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount)).to.be.revertedWith(
        'Only deposit allowed',
      );
    });

    it('Should revert if the coller is not the owner', async () => {
      const holders = [await alice.getAddress(), await bob.getAddress()];
      const keyCount = [1, 1];
      await expect(
        nftlRaffle.connect(alice).distributeTicketsToCitadelKeyHolders(holders, keyCount),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('distributeTicketsToUsers', () => {
    beforeEach(async () => {
      // deposit tokens
      let nftlAmountToDeposit = nftlAmountPerTicket * 100n;
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 100
    });

    it('Shoud be able to distribute tickets to users', async () => {
      // distribute tickets
      const users = [await alice.getAddress(), await bob.getAddress()];
      const ticketCount = [1, 50];
      await nftlRaffle.distributeTicketsToUsers(users, ticketCount); // 101, 50

      let aliceDepositBefore = await nftlRaffle.userDeposits(await alice.getAddress());
      let bobDepositBefore = await nftlRaffle.userDeposits(await bob.getAddress());
      expect(aliceDepositBefore).to.equal(nftlAmountPerTicket * 101n);
      expect(bobDepositBefore).to.equal(nftlAmountPerTicket * 50n);

      // Alice deposits after distributing tickets
      let nftlAmountToDeposit = (nftlAmountPerTicket * 2n + nftlAmountPerTicket) / 2n; // x2.5
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 103.5, 50

      expect(await nftlRaffle.userDeposits(await alice.getAddress())).to.equal(
        (nftlAmountPerTicket * 103n + nftlAmountPerTicket) / 2n,
      );
      expect(await nftlRaffle.userDeposits(await bob.getAddress())).to.equal(nftlAmountPerTicket * 50n);

      // Check the user status
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner
      expect(await nftlRaffle.getUserCount()).to.equal(2); // Alice, Bob
      expect(await nftlRaffle.getUserList()).to.deep.equal([await alice.getAddress(), await bob.getAddress()]); // Alice, Bob
      expect(await nftlRaffle.totalTicketCount()).to.equal(0);
    });

    it('Should revert if the user params are invalid', async () => {
      const users = [await alice.getAddress(), await bob.getAddress()];
      const ticketCount = [1, 1, 1];
      await expect(nftlRaffle.distributeTicketsToUsers(users, ticketCount)).to.be.revertedWith('Invalid params');
    });

    it('Should revert if deposit is disallowed', async () => {
      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // distribute tickets
      const users = [await alice.getAddress(), await bob.getAddress()];
      const ticketCount = [1, 1, 1];
      await expect(nftlRaffle.distributeTicketsToUsers(users, ticketCount)).to.be.revertedWith('Only deposit allowed');
    });

    it('Should revert if the coller is not the owner', async () => {
      const users = [await alice.getAddress(), await bob.getAddress()];
      const ticketCount = [1, 1];
      await expect(nftlRaffle.connect(alice).distributeTicketsToUsers(users, ticketCount)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('deposit', () => {
    beforeEach(async () => {
      // distribute tickets to CitadelKey holders
      const holders = [await alice.getAddress()];
      const keyCount = [1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount); // 100
    });

    it('Should be able to deposit NFTL tokens', async () => {
      // Alice deposits
      let aliceNFTLBalanceBefore = await nftlToken.balanceOf(await alice.getAddress());
      let aliceTicketCountBefore = await nftlRaffle.ticketCountByUser(await alice.getAddress());

      let nftlAmountToDeposit = (nftlAmountPerTicket * 2n + nftlAmountPerTicket) / 2n; // x2.5
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 102.5

      expect(await nftlToken.balanceOf(await alice.getAddress())).equal(aliceNFTLBalanceBefore - nftlAmountToDeposit);
      expect(await nftlRaffle.userDeposits(await alice.getAddress())).equal(
        (nftlAmountPerTicket * 102n + nftlAmountPerTicket) / 2n,
      );

      // Bob deposits
      let bobNFTLBalanceBefore = await nftlToken.balanceOf(await bob.getAddress());
      let bobTicketCountBefore = await nftlRaffle.ticketCountByUser(await bob.getAddress());

      nftlAmountToDeposit = (nftlAmountPerTicket * 2n + nftlAmountPerTicket) / 2n; // x2.5
      await nftlToken.connect(bob).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit); // 2.5

      expect(await nftlToken.balanceOf(await bob.getAddress())).equal(bobNFTLBalanceBefore - nftlAmountToDeposit);
      expect(await nftlRaffle.userDeposits(await bob.getAddress())).to.equal(
        (nftlAmountPerTicket * 2n + nftlAmountPerTicket) / 2n,
      ); // (102.5, 2.5)

      // Alice deposits
      aliceNFTLBalanceBefore = await nftlToken.balanceOf(await alice.getAddress());
      aliceTicketCountBefore = await nftlRaffle.ticketCountByUser(await alice.getAddress());

      nftlAmountToDeposit = (nftlAmountPerTicket * 2n + nftlAmountPerTicket) / 2n; // x2.5
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit); // 102.5
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      expect(await nftlToken.balanceOf(await alice.getAddress())).equal(aliceNFTLBalanceBefore - nftlAmountToDeposit);
      expect(await nftlRaffle.userDeposits(await alice.getAddress())).to.equal(nftlAmountPerTicket * 105n); // (105, 2.5))

      // Check the user status
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner
      expect(await nftlRaffle.getUserCount()).to.equal(2); // Alice, Bob
      expect(await nftlRaffle.getUserList()).to.deep.equal([await alice.getAddress(), await bob.getAddress()]); // Alice, Bob
      expect(await nftlRaffle.totalTicketCount()).to.equal(0);
    });

    it('Should revert if deposit is disallowed', async () => {
      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // deposit
      const nftlAmountToDeposit = nftlAmountPerTicket; // x1
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await expect(nftlRaffle.connect(alice).deposit(nftlAmountToDeposit)).to.be.revertedWith('Only deposit allowed');
    });
  });

  describe('assignTicketToUsers', () => {
    beforeEach(async () => {
      let nftlAmountToDeposit = nftlAmountPerTicket * 10n; // x10

      // Alice deposits NFTL and get 10 tickets
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      // Bob deposits NFTL and get 10 tickets
      await nftlToken.connect(bob).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit);

      // John deposits NFTL and get 10 tickets
      await nftlToken.connect(john).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(john).deposit(nftlAmountToDeposit);

      // distribute tickets
      const holders = [await alice.getAddress()];
      const count = [1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, count);

      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();
    });

    it('Should be able to assign the tickets to users', async () => {
      await nftlRaffle.assignTicketToUsers();

      expect(await nftlRaffle.ticketRangeByUser(await alice.getAddress())).to.deep.equal([0, 109]);
      expect(await nftlRaffle.ticketRangeByUser(await bob.getAddress())).to.deep.equal([110, 119]);
      expect(await nftlRaffle.ticketRangeByUser(await john.getAddress())).to.deep.equal([120, 129]);
      expect(await nftlRaffle.totalTicketCount()).to.equal(130);
    });

    it('Should revert if the tickets was already assigned', async () => {
      await nftlRaffle.assignTicketToUsers();
      await expect(nftlRaffle.assignTicketToUsers()).to.be.revertedWith('Already assigned');
    });

    it('Should revert if the user deposit is allowed', async () => {
      // allow the deposit
      await nftlRaffle.allowUserDeposit();

      await expect(nftlRaffle.assignTicketToUsers()).to.be.revertedWith('Only deposit disallowed');
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).assignTicketToUsers()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('requestRandomWordsForWinnerSelection & rawFulfillRandomWords', () => {
    beforeEach(async () => {
      let nftlAmountToDeposit = nftlAmountPerTicket * 10n; // x10

      // Alice deposits NFTL and get 10 tickets
      await nftlToken.connect(alice).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      // Bob deposits NFTL and get 10 tickets
      await nftlToken.connect(bob).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit);

      // John deposits NFTL and get 10 tickets
      await nftlToken.connect(john).approve(await nftlRaffle.getAddress(), nftlAmountToDeposit);
      await nftlRaffle.connect(john).deposit(nftlAmountToDeposit);

      // distribute tickets
      const holders = [await alice.getAddress()];
      const count = [1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, count);

      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // assign tickets
      await nftlRaffle.assignTicketToUsers();

      // add the consumer
      await nftlRaffle.manageConsumers(await nftlRaffle.getAddress(), true);

      // charge LINK tokens
      const linkTokenAmountToCharge = ethers.parseEther('10');
      await linkToken.approve(await nftlRaffle.getAddress(), linkTokenAmountToCharge);
      await nftlRaffle.chargeLINK(linkTokenAmountToCharge);

      // deposit the prize NFT
      const tokenIds = [1, 3, 5, 6, 9];
      await prizeNFT.setApprovalForAll(await nftlRaffle.getAddress(), true);
      await nftlRaffle.depositPrizeNFT(tokenIds);
    });

    it('Should be able to request the random words', async () => {
      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;

      // request
      let requestId = await nftlRaffle.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0);
    });

    it('Should not request the random words if it already exists', async () => {
      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;

      const impersonatedCoordinator = await impersonate(VRF_COORDINATOR_ADDRESS);

      // request
      let requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0);

      // receive 1 random word
      let randomWords = [50] as BigNumberish[];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(1);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the received random word was already used

      // receive 2 random words
      randomWords = [50, 100] as BigNumberish[];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(2);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the first random word was already used for the winner selection

      // receive 2 random words
      randomWords = [100, 100] as BigNumberish[];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(2);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the 2 random words was already used for the winner selection

      // receive 3 random words
      randomWords = [51, 100, 50] as BigNumberish[];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.deep.equal([50, 100]);
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(3);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request, the random words exists but all of them were already used
      requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the 2 random words was already used for the winner selection

      // receive 3 random words
      randomWords = [128, 129, 130] as BigNumberish[];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.deep.equal([130, 129]);
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(4);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.equal(0); // not request since the received random words already exist
    });

    it('Should revert if the request is oveflow', async () => {
      // request
      let requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      // receive 1 random word
      const impersonatedCoordinator = await impersonate(VRF_COORDINATOR_ADDRESS);

      let randomWords = [50] as BigNumberish[];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(1);

      // updat the total winner ticket count
      const newTotalWinnerTicketCount = 1;
      await nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount);

      await expect(nftlRaffle.requestRandomWordsForWinnerSelection()).to.be.revertedWith('Request overflow');
    });

    it('Should revert if the depositor count is not enough', async () => {
      const newTotalWinnerTicketCount = 5000;
      await nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount);

      await expect(nftlRaffle.requestRandomWordsForWinnerSelection()).to.be.revertedWith('Not enough depositors');
    });

    it('Should revert if the coller is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).requestRandomWordsForWinnerSelection()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('Should revert if the caller is not the VRF Coordinator', async () => {
      let requestId = (await nftlRaffle.requestRandomWordsForWinnerSelection()) as unknown as BigNumberish;

      const randomWords = [0n, 0n, 50n, 100n, 250n] as BigNumberish[];
      await expect(nftlRaffle.connect(alice).rawFulfillRandomWords(requestId, randomWords)).to.be.revertedWith(
        'Only VRF coordinator',
      );
    });
  });

  describe('cancelSubscription', () => {
    const linkTokenAmountToCharge = ethers.parseEther('10');

    beforeEach(async () => {
      // charge LINK tokens
      await linkToken.approve(await nftlRaffle.getAddress(), linkTokenAmountToCharge);
      await nftlRaffle.chargeLINK(linkTokenAmountToCharge);
    });

    it('Should be able to cancel the subscription', async () => {
      expect(await nftlRaffle.subscriptionId()).to.not.equal(0);
      let deployerLinkTokenAmountBefore = await linkToken.balanceOf(await deployer.getAddress());

      // cancel the subscription
      await nftlRaffle.cancelSubscription();

      expect(await nftlRaffle.subscriptionId()).to.equal(0);
      expect(await linkToken.balanceOf(await deployer.getAddress())).to.equal(
        deployerLinkTokenAmountBefore + linkTokenAmountToCharge,
      );
    });

    it('Should revert if the callier is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).cancelSubscription()).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('updateTotalWinnerTicketCount', () => {
    it('Should be able to update the totalWinnerTicketCount', async () => {
      const newTotalWinnerTicketCount = 30;
      await nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount);

      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(newTotalWinnerTicketCount);
    });

    it('Should revert if the totalWinnerTicketCount is zero', async () => {
      const newTotalWinnerTicketCount = 0;
      await expect(nftlRaffle.updateTotalWinnerTicketCount(newTotalWinnerTicketCount)).to.be.revertedWith(
        'Zero winner ticket count',
      );
    });

    it('Should revert if the caller is not the owner', async () => {
      const newTotalWinnerTicketCount = 30;
      await expect(
        nftlRaffle.connect(alice).updateTotalWinnerTicketCount(newTotalWinnerTicketCount),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('pause/unpause', () => {
    it('Pause', async () => {
      expect(await nftlRaffle.paused()).to.be.false;

      // Pause the contract
      await nftlRaffle.pause();

      // check pause status
      expect(await nftlRaffle.paused()).to.be.true;
    });

    it('Unpause', async () => {
      // Pause the contract
      await nftlRaffle.pause();

      // Unpause the contract
      await nftlRaffle.unpause();

      // check pause status
      expect(await nftlRaffle.paused()).to.be.false;
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).pause()).to.be.reverted;
      await expect(nftlRaffle.connect(alice).unpause()).to.be.reverted;
    });
  });
});
