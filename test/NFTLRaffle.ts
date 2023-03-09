import { expect } from 'chai';
import { ethers, upgrades, network } from 'hardhat';
import { BigNumber, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import type {
  NFTLRaffle,
  MockERC20,
  MockERC721,
  VRFCoordinatorV2Interface,
  LinkTokenInterface,
} from '../typechain-types';

const getCurrentBlockTimestamp = async (): Promise<BigNumber> => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return BigNumber.from(block.timestamp);
};

const toBytes32 = (bn: BigNumber) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

const getAccountToken = async (amount: BigNumber, userAddress: string, tokenAddress: string, slot: number) => {
  // Get storage slot index
  const index = ethers.utils.solidityKeccak256(
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
  let accounts: SignerWithAddress[];
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let john: SignerWithAddress;
  let nftlRaffle: NFTLRaffle;
  let nftlToken: MockERC20;
  let prizeNFT: MockERC721;
  let vrfCoordinator: VRFCoordinatorV2Interface;
  let linkToken: LinkTokenInterface;

  let requestId: BigNumber;

  const pendingPeriod = 86400 * 2; // 2 days
  const totalWinnerTicketCount = 5;
  const nftlAmountPerTicket = ethers.utils.parseEther('1000');
  const initialNFTLAmount = nftlAmountPerTicket.mul(1000);

  const ZERO_ADDRESS = ethers.constants.AddressZero;
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
    nftlToken = await MockERC20.deploy();

    // deploy MockERC721 contract
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    prizeNFT = await MockERC721.deploy();

    // get VRFCoordinatorV2 contract
    vrfCoordinator = await ethers.getContractAt('VRFCoordinatorV2Interface', VRF_COORDINATOR_ADDRESS);

    // get Link contract
    linkToken = await ethers.getContractAt('LinkTokenInterface', LINK_TOKEN_ADDRESS);

    // deploy NFTLRaffle contract
    const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
    nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
      nftlToken.address,
      pendingPeriod,
      totalWinnerTicketCount,
      prizeNFT.address,
      vrfCoordinator.address,
    ])) as NFTLRaffle;

    // mint NFTL tokens
    await nftlToken.mint(alice.address, initialNFTLAmount);
    await nftlToken.mint(bob.address, initialNFTLAmount);
    await nftlToken.mint(john.address, initialNFTLAmount);

    // mint Prize NFTs
    for (let i = 0; i < 10; i++) {
      await prizeNFT.mint(deployer.address);
    }

    // fund LINK tokens
    await getAccountToken(ethers.utils.parseEther('100'), deployer.address, LINK_TOKEN_ADDRESS, 1);

    // allow deposit
    await nftlRaffle.allowUserDeposit();
  });

  describe('Initialize', () => {
    it('Should be able to initialize the contract', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      nftlRaffle = (await upgrades.deployProxy(NFTLRaffle, [
        nftlToken.address,
        pendingPeriod,
        totalWinnerTicketCount,
        prizeNFT.address,
        vrfCoordinator.address,
      ])) as NFTLRaffle;
    });

    it('Should revert if the NFTL contract address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          ZERO_ADDRESS,
          pendingPeriod,
          totalWinnerTicketCount,
          prizeNFT.address,
          vrfCoordinator.address,
        ]),
      ).to.be.revertedWith('Zero address');
    });

    it('Should revert if the pendign period is not greater than 1 day', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          nftlToken.address,
          86400,
          totalWinnerTicketCount,
          prizeNFT.address,
          vrfCoordinator.address,
        ]),
      ).to.be.revertedWith('1 day +');
    });

    it('Should revert if the totalWinnerTicketCount is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          nftlToken.address,
          pendingPeriod,
          0,
          prizeNFT.address,
          vrfCoordinator.address,
        ]),
      ).to.be.revertedWith('Zero winner ticket count');
    });

    it('Should revert if the prize NFT address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          nftlToken.address,
          pendingPeriod,
          totalWinnerTicketCount,
          ZERO_ADDRESS,
          vrfCoordinator.address,
        ]),
      ).to.be.revertedWith('Zero address');
    });

    it('Should revert if the VRF coordinator address is zero', async () => {
      const NFTLRaffle = await ethers.getContractFactory('NFTLRaffle');
      await expect(
        upgrades.deployProxy(NFTLRaffle, [
          nftlToken.address,
          pendingPeriod,
          totalWinnerTicketCount,
          prizeNFT.address,
          ZERO_ADDRESS,
        ]),
      ).to.be.revertedWith('Zero address');
    });
  });

  describe('depositPrizeNFT', () => {
    it('Should be able the deposit the prize NFT', async () => {
      const tokenIds = [1, 3, 5, 6, 9];
      await prizeNFT.setApprovalForAll(nftlRaffle.address, true);
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
      let linkTokenBalanceBefore = await linkToken.balanceOf(deployer.address);

      // charge LINK tokens
      const linkTokenAmountToCharge = ethers.utils.parseEther('10');
      await linkToken.approve(nftlRaffle.address, linkTokenAmountToCharge);
      await nftlRaffle.chargeLINK(linkTokenAmountToCharge);

      expect(await linkToken.balanceOf(deployer.address)).to.equal(linkTokenBalanceBefore.sub(linkTokenAmountToCharge));
    });
  });

  describe('manageConsumers', () => {
    it('Should be able to add/remove the consumers', async () => {
      await nftlRaffle.manageConsumers(nftlRaffle.address, true);
      await nftlRaffle.manageConsumers(nftlRaffle.address, false);
    });

    it('Should revert if the caller is not the owner', async () => {
      await expect(nftlRaffle.connect(alice).manageConsumers(nftlRaffle.address, true)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
      await expect(nftlRaffle.connect(alice).manageConsumers(nftlRaffle.address, false)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('distributeTicketsToCitadelKeyHolders', () => {
    beforeEach(async () => {
      // deposit tokens
      let nftlAmountToDeposit = nftlAmountPerTicket.mul(100);
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 100
    });

    it('Shoud be able to distribute tickets to CitadelKey holders', async () => {
      // distribute tickets
      const holders = [alice.address, bob.address];
      const keyCount = [1, 1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount); // 200, 100

      let aliceDepositBefore = await nftlRaffle.userDeposits(alice.address);
      let bobDepositBefore = await nftlRaffle.userDeposits(bob.address);
      expect(aliceDepositBefore).to.equal(nftlAmountPerTicket.mul(200));
      expect(bobDepositBefore).to.equal(nftlAmountPerTicket.mul(100));

      // Alice deposits after distributing tickets
      let nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 202.5, 100

      expect(await nftlRaffle.userDeposits(alice.address)).to.equal(
        nftlAmountPerTicket.mul(202).add(nftlAmountPerTicket.div(2)),
      );
      expect(await nftlRaffle.userDeposits(bob.address)).to.equal(nftlAmountPerTicket.mul(100));

      // Check the user status
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner
      expect(await nftlRaffle.getUserCount()).to.equal(2); // Alice, Bob
      expect(await nftlRaffle.getUserList()).to.deep.equal([alice.address, bob.address]); // Alice, Bob
      expect(await nftlRaffle.totalTicketCount()).to.equal(0);
    });

    it('Should revert if the holder params are invalid', async () => {
      const holders = [alice.address, bob.address];
      const keyCount = [1, 1, 1];
      await expect(nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount)).to.be.revertedWith(
        'Invalid params',
      );
    });

    it('Should revert if deposit is disallowed', async () => {
      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // distribute tickets
      const holders = [alice.address, bob.address];
      const keyCount = [1, 1, 1];
      await expect(nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount)).to.be.revertedWith(
        'Only deposit allowed',
      );
    });

    it('Should revert if the coller is not the owner', async () => {
      const holders = [alice.address, bob.address];
      const keyCount = [1, 1];
      await expect(
        nftlRaffle.connect(alice).distributeTicketsToCitadelKeyHolders(holders, keyCount),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('deposit', () => {
    beforeEach(async () => {
      // distribute tickets to CitadelKey holders
      const holders = [alice.address];
      const keyCount = [1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, keyCount); // 100
    });

    it('Should be able to deposit NFTL tokens', async () => {
      // Alice deposits
      let aliceNFTLBalanceBefore = await nftlToken.balanceOf(alice.address);
      let aliceTicketCountBefore = await nftlRaffle.ticketCountByUser(alice.address);

      let nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit); // 102.5

      expect(await nftlToken.balanceOf(alice.address)).equal(aliceNFTLBalanceBefore.sub(nftlAmountToDeposit));
      expect(await nftlRaffle.userDeposits(alice.address)).equal(
        nftlAmountPerTicket.mul(102).add(nftlAmountPerTicket.div(2)),
      );

      // Bob deposits
      let bobNFTLBalanceBefore = await nftlToken.balanceOf(bob.address);
      let bobTicketCountBefore = await nftlRaffle.ticketCountByUser(bob.address);

      nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5
      await nftlToken.connect(bob).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit); // 2.5

      expect(await nftlToken.balanceOf(bob.address)).equal(bobNFTLBalanceBefore.sub(nftlAmountToDeposit));
      expect(await nftlRaffle.userDeposits(bob.address)).to.equal(
        nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)),
      ); // (102.5, 2.5)

      // Alice deposits
      aliceNFTLBalanceBefore = await nftlToken.balanceOf(alice.address);
      aliceTicketCountBefore = await nftlRaffle.ticketCountByUser(alice.address);

      nftlAmountToDeposit = nftlAmountPerTicket.mul(2).add(nftlAmountPerTicket.div(2)); // x2.5
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit); // 102.5
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      expect(await nftlToken.balanceOf(alice.address)).equal(aliceNFTLBalanceBefore.sub(nftlAmountToDeposit));
      expect(await nftlRaffle.userDeposits(alice.address)).to.equal(nftlAmountPerTicket.mul(105)); // (105, 2.5))

      // Check the user status
      expect(await nftlRaffle.getWinners()).to.be.empty; // No winner
      expect(await nftlRaffle.getUserCount()).to.equal(2); // Alice, Bob
      expect(await nftlRaffle.getUserList()).to.deep.equal([alice.address, bob.address]); // Alice, Bob
      expect(await nftlRaffle.totalTicketCount()).to.equal(0);
    });

    it('Should revert if deposit is disallowed', async () => {
      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // deposit
      const nftlAmountToDeposit = nftlAmountPerTicket; // x1
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await expect(nftlRaffle.connect(alice).deposit(nftlAmountToDeposit)).to.be.revertedWith('Only deposit allowed');
    });
  });

  describe('assignTicketToUsers', () => {
    beforeEach(async () => {
      let nftlAmountToDeposit = nftlAmountPerTicket.mul(10); // x10

      // Alice deposits NFTL and get 10 tickets
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      // Bob deposits NFTL and get 10 tickets
      await nftlToken.connect(bob).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit);

      // John deposits NFTL and get 10 tickets
      await nftlToken.connect(john).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(john).deposit(nftlAmountToDeposit);

      // distribute tickets
      const holders = [alice.address];
      const count = [1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, count);

      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();
    });

    it('Should be able to assign the tickets to users', async () => {
      await nftlRaffle.assignTicketToUsers();

      expect(await nftlRaffle.ticketRangeByUser(alice.address)).to.deep.equal([0, 109]);
      expect(await nftlRaffle.ticketRangeByUser(bob.address)).to.deep.equal([110, 119]);
      expect(await nftlRaffle.ticketRangeByUser(john.address)).to.deep.equal([120, 129]);
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
      let nftlAmountToDeposit = nftlAmountPerTicket.mul(10); // x10

      // Alice deposits NFTL and get 10 tickets
      await nftlToken.connect(alice).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(alice).deposit(nftlAmountToDeposit);

      // Bob deposits NFTL and get 10 tickets
      await nftlToken.connect(bob).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(bob).deposit(nftlAmountToDeposit);

      // John deposits NFTL and get 10 tickets
      await nftlToken.connect(john).approve(nftlRaffle.address, nftlAmountToDeposit);
      await nftlRaffle.connect(john).deposit(nftlAmountToDeposit);

      // distribute tickets
      const holders = [alice.address];
      const count = [1];
      await nftlRaffle.distributeTicketsToCitadelKeyHolders(holders, count);

      // disallow the deposit
      await nftlRaffle.disallowUserDeposit();

      // assign tickets
      await nftlRaffle.assignTicketToUsers();

      // add the consumer
      await nftlRaffle.manageConsumers(nftlRaffle.address, true);

      // charge LINK tokens
      const linkTokenAmountToCharge = ethers.utils.parseEther('10');
      await linkToken.approve(nftlRaffle.address, linkTokenAmountToCharge);
      await nftlRaffle.chargeLINK(linkTokenAmountToCharge);

      // deposit the prize NFT
      const tokenIds = [1, 3, 5, 6, 9];
      await prizeNFT.setApprovalForAll(nftlRaffle.address, true);
      await nftlRaffle.depositPrizeNFT(tokenIds);
    });

    it('Should be able to request the random words', async () => {
      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;

      // request
      let requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0);
    });

    it('Should not request the random words if it already exists', async () => {
      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;

      const impersonatedCoordinator = await impersonate(VRF_COORDINATOR_ADDRESS);

      // request
      let requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0);

      // receive 1 random word
      let randomWords = [50];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(1);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the received random word was already used

      // receive 2 random words
      randomWords = [50, 100];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(2);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the first random word was already used for the winner selection

      // receive 2 random words
      randomWords = [100, 100];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.be.empty;
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(2);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the 2 random words was already used for the winner selection

      // receive 3 random words
      randomWords = [51, 100, 50];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.deep.equal([50, 100]);
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(3);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request, the random words exists but all of them were already used
      requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.not.equal(0); // request since the 2 random words was already used for the winner selection

      // receive 3 random words
      randomWords = [128, 129, 130];
      await nftlRaffle.connect(impersonatedCoordinator).rawFulfillRandomWords(requestId, randomWords);

      expect(await nftlRaffle.getRandomWordsList()).to.deep.equal([130, 129]);
      expect(await nftlRaffle.currentWinnerTicketCount()).to.equal(4);
      expect(await nftlRaffle.totalWinnerTicketCount()).to.equal(totalWinnerTicketCount);

      // request
      requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      expect(requestId).to.equal(0); // not request since the received random words already exist
    });

    it('Should revert if the request is oveflow', async () => {
      // request
      let requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();
      await nftlRaffle.requestRandomWordsForWinnerSelection();

      // receive 1 random word
      const impersonatedCoordinator = await impersonate(VRF_COORDINATOR_ADDRESS);

      let randomWords = [50];
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
      let requestId = await nftlRaffle.callStatic.requestRandomWordsForWinnerSelection();

      const randomWords = [0, 0, 50, 100, 250];
      await expect(nftlRaffle.connect(alice).rawFulfillRandomWords(requestId, randomWords)).to.be.revertedWith(
        'Only VRF coordinator',
      );
    });
  });

  describe('cancelSubscription', () => {
    const linkTokenAmountToCharge = ethers.utils.parseEther('10');

    beforeEach(async () => {
      // charge LINK tokens
      await linkToken.approve(nftlRaffle.address, linkTokenAmountToCharge);
      await nftlRaffle.chargeLINK(linkTokenAmountToCharge);
    });

    it('Should be able to cancel the subscription', async () => {
      expect(await nftlRaffle.s_subscriptionId()).to.not.equal(0);
      let deployerLinkTokenAmountBefore = await linkToken.balanceOf(deployer.address);

      // cancel the subscription
      await nftlRaffle.cancelSubscription();

      expect(await nftlRaffle.s_subscriptionId()).to.equal(0);
      expect(await linkToken.balanceOf(deployer.address)).to.equal(
        deployerLinkTokenAmountBefore.add(linkTokenAmountToCharge),
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
