// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {Initializable} from "@openzeppelin/contracts-upgradeable/v4/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/security/PausableUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC721/IERC721Upgradeable.sol";
import {ERC721HolderUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/utils/structs/EnumerableSetUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

interface IERC20BurnableUpgradeable is IERC20Upgradeable {
    function burnFrom(address account, uint256 amount) external;
}

/**
 * @title NFTLRaffle
 */
contract NFTLRaffle is Initializable, OwnableUpgradeable, PausableUpgradeable, ERC721HolderUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct WinnerInfo {
        uint256 ticketId;
        address winner;
        uint256 prizeTokenId;
    }

    struct TicketRange {
        uint256 startTicketId;
        uint256 endTicketId;
    }

    /// @dev Chainlink VRF params
    address private _vrfCoordinator; // etherscan: 0x271682DEB8C4E0901D1a1550aD2e64D568E69909
    address private constant _LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    bytes32 private constant _S_KEY_HASH = 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef;
    uint16 private constant _S_REQUEST_CONFIRMATIONS = 3;
    uint32 private constant _S_CALLBACK_GAS_LIMIT = 2500000;
    uint64 public subscriptionId;

    /// @dev Prize NFT (NiftyDegen) address
    IERC721Upgradeable public prizeNFT;

    /// @dev PrizeNFT TokenIds
    uint256[] public prizeNFTokenIds;

    /// @dev NFTL address
    IERC20BurnableUpgradeable public nftl;

    /// @dev Timestamp the raffle start
    uint256 public raffleStartAt; // deprecated

    /// @dev Total winner count to select
    uint256 public totalWinnerTicketCount;

    /// @dev Current selected winner count
    uint256 public currentWinnerTicketCount;

    /// @dev Winner list
    WinnerInfo[] public winners;

    /// @dev Total ticket count
    uint256 public totalTicketCount;

    /// @dev NFTL amount required for 1 ticket
    uint256 public constant NFTL_AMOUNT_FOR_TICKET = 1000 * 10 ** 18;

    /// @dev User list
    EnumerableSetUpgradeable.AddressSet internal _userList;

    /// @dev User -> NFTL amount deposited
    mapping(address user => uint256 amount) public userDeposits;

    /// @dev User -> Ticket count
    mapping(address user => uint256 count) public ticketCountByUser; // deprecated

    /// @dev Swith to on/off the deposit
    bool public isUserDepositAllowed;

    /// @dev Ticket assign status
    bool public isTicketAssignedToUsers;

    /// @dev User -> Ticket range
    mapping(address user => TicketRange range) public ticketRangeByUser;

    /// @dev Winner Ticket Id -> Bool
    mapping(uint256 ticketId => bool isWinner) public isWinnerTicketId;

    /// @dev Random word list
    uint256[] public randomWordList;

    event NewUser(address indexed to);
    event TicketDistributed(address indexed to, uint256 ticketCount);
    event UserDeposited(address indexed user, uint256 nftlAmount);
    event RandomWordsRequested(uint256 requestId, uint256 randomCountToRequest);
    event RandomWordsReceived(uint256 requestId, uint256[] randomWords);
    event WinnerSelected(address indexed by, address indexed winner, uint256 ticketId, uint256 prizeTokenId);

    error AccessError(string message);
    error AddressError(string message);
    error InputError(string message);

    modifier onlyDepositAllowed() {
        if (!isUserDepositAllowed) revert AccessError("Only deposit allowed");
        _;
    }

    modifier onlyDepositDisallowed() {
        if (isUserDepositAllowed) revert AccessError("Only deposit disallowed");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _nftl,
        uint256 _pendingPeriod,
        uint256 _totalWinnerTicketCount,
        address _prizeNFT,
        address __vrfCoordinator
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ERC721Holder_init();

        if (_nftl == address(0) || _prizeNFT == address(0) || __vrfCoordinator == address(0))
            revert AddressError("Zero address");
        if (_pendingPeriod <= 86400) revert InputError("1 day +");
        if (_totalWinnerTicketCount == 0) revert InputError("Zero winner ticket count");

        nftl = IERC20BurnableUpgradeable(_nftl);
        raffleStartAt = block.timestamp + _pendingPeriod; // deprecated
        totalWinnerTicketCount = _totalWinnerTicketCount;
        prizeNFT = IERC721Upgradeable(_prizeNFT);
        _vrfCoordinator = __vrfCoordinator;

        _createNewSubscription();
    }

    function depositPrizeNFT(uint256[] calldata _prizeNFTTokenIds) external onlyOwner {
        uint256 totalPrizeCount = _prizeNFTTokenIds.length;
        if ((totalPrizeCount + prizeNFTokenIds.length) != totalWinnerTicketCount)
            revert InputError("Mismatched prize count");

        for (uint256 i = 0; i < totalPrizeCount; ++i) {
            prizeNFTokenIds.push(_prizeNFTTokenIds[i]);
        }

        for (uint256 i = 0; i < totalPrizeCount; ) {
            uint256 prizeNFTTokenId = _prizeNFTTokenIds[i];
            prizeNFT.safeTransferFrom(msg.sender, address(this), prizeNFTTokenId, bytes(""));

            unchecked {
                ++i;
            }
        }
    }

    function cancelSubscription() external onlyOwner {
        uint64 cancelId = subscriptionId;
        subscriptionId = 0;
        VRFCoordinatorV2Interface(_vrfCoordinator).cancelSubscription(cancelId, owner());
    }

    function updateTotalWinnerTicketCount(uint256 _totalWinnerTicketCount) external onlyOwner {
        if (_totalWinnerTicketCount == 0) revert InputError("Zero winner ticket count");
        totalWinnerTicketCount = _totalWinnerTicketCount;
    }

    function distributeTicketsToCitadelKeyHolders(
        address[] calldata _holders,
        uint256[] calldata _keyCount
    ) external onlyDepositAllowed onlyOwner {
        uint256 holderCount = _holders.length;
        if (holderCount != _keyCount.length) revert InputError("Invalid params");

        // distribute 100 tickets to each Citadel Key holders
        for (uint256 i = 0; i < holderCount; ) {
            address holder = _holders[i];
            uint256 userTicketCountToAssign = 100 * _keyCount[i];

            // mark as if the holder deposited tokens for the userTicketCountToAssign calculation in deposit() function.
            userDeposits[holder] += userTicketCountToAssign * NFTL_AMOUNT_FOR_TICKET;

            // add the user if not exist
            bool added = _userList.add(holder);
            if (added) emit NewUser(holder);

            emit TicketDistributed(holder, userTicketCountToAssign);

            unchecked {
                ++i;
            }
        }
    }

    function distributeTicketsToUsers(
        address[] calldata _users,
        uint256[] calldata _ticketCount
    ) external onlyDepositAllowed onlyOwner {
        uint256 userCount = _users.length;
        if (userCount != _ticketCount.length) revert InputError("Invalid params");

        // distribute tickets to users
        for (uint256 i = 0; i < userCount; ) {
            address user = _users[i];
            uint256 userTicketCountToAssign = _ticketCount[i];

            // mark as if the user deposited tokens for the userTicketCountToAssign calculation in deposit() function.
            userDeposits[user] += userTicketCountToAssign * NFTL_AMOUNT_FOR_TICKET;

            // add the user if not exist
            bool added = _userList.add(user);
            if (added) emit NewUser(user);

            emit TicketDistributed(user, userTicketCountToAssign);

            unchecked {
                ++i;
            }
        }
    }

    function deposit(uint256 _amount) external onlyDepositAllowed whenNotPaused {
        // burn NFTL tokens
        nftl.burnFrom(msg.sender, _amount);

        // increase the user deposit
        userDeposits[msg.sender] += _amount;

        // add the user if not exist
        bool added = _userList.add(msg.sender);
        if (added) emit NewUser(msg.sender);

        emit UserDeposited(msg.sender, _amount);
    }

    function assignTicketToUsers() external onlyDepositDisallowed onlyOwner {
        if (isTicketAssignedToUsers) revert InputError("Already assigned");
        isTicketAssignedToUsers = true;

        uint256 totalUserCount = getUserCount();
        address[] memory users = getUserList();
        uint256 currentTotalTicketCount = 0;

        for (uint256 i = 0; i < totalUserCount; ) {
            address user = users[i];
            uint256 userTicketCountToAssign = userDeposits[user] / NFTL_AMOUNT_FOR_TICKET;
            if (userTicketCountToAssign != 0) {
                ticketRangeByUser[user] = TicketRange({
                    startTicketId: currentTotalTicketCount,
                    endTicketId: currentTotalTicketCount + userTicketCountToAssign - 1
                });
            }

            unchecked {
                currentTotalTicketCount += userTicketCountToAssign;
                ++i;
            }
        }

        // set the total ticket count
        totalTicketCount = currentTotalTicketCount;
    }

    function manageConsumers(address _consumer, bool _add) external onlyOwner {
        _add
            ? VRFCoordinatorV2Interface(_vrfCoordinator).addConsumer(subscriptionId, _consumer)
            : VRFCoordinatorV2Interface(_vrfCoordinator).removeConsumer(subscriptionId, _consumer);
    }

    function chargeLINK(uint256 _amount) external returns (bool success) {
        IERC20Upgradeable(_LINK).safeTransferFrom(msg.sender, address(this), _amount);
        return LinkTokenInterface(_LINK).transferAndCall(_vrfCoordinator, _amount, abi.encode(subscriptionId));
    }

    function withdrawLINK(address _to) external onlyOwner {
        IERC20Upgradeable(_LINK).safeTransfer(_to, IERC20Upgradeable(_LINK).balanceOf(address(this)));
    }

    function requestRandomWordsForWinnerSelection()
        external
        onlyDepositDisallowed
        onlyOwner
        returns (uint256 requestId)
    {
        if (currentWinnerTicketCount >= totalWinnerTicketCount) revert InputError("Request overflow");
        if (totalWinnerTicketCount > totalTicketCount) revert InputError("Not enough depositors");

        if (randomWordList.length != 0) {
            // select winners
            bool isWinnerSelected = _selectWinners();
            if (isWinnerSelected) return 0;
        }

        // request the random words ans select winners
        uint256 winnerCountToRequest = totalWinnerTicketCount * 2;
        requestId = _requestRandomWords(uint32(winnerCountToRequest));

        emit RandomWordsRequested(requestId, winnerCountToRequest);
    }

    // rawFulfillRandomness is called by VRFCoordinator when it receives a valid VRF
    // proof. rawFulfillRandomness then calls fulfillRandomness, after validating
    // the origin of the call
    function rawFulfillRandomWords(uint256 _requestId, uint256[] calldata _randomWords) external {
        if (msg.sender != _vrfCoordinator) revert AccessError("Only VRF coordinator");
        emit RandomWordsReceived(_requestId, _randomWords);
        _fulfillRandomWords(_requestId, _randomWords);
    }

    function allowUserDeposit() external onlyOwner {
        isUserDepositAllowed = true;
    }

    function disallowUserDeposit() external onlyOwner {
        isUserDepositAllowed = false;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    function getWinners() external view returns (WinnerInfo[] memory winnerList) {
        return winners;
    }

    function getRandomWordsList() external view returns (uint256[] memory wordList) {
        return randomWordList;
    }

    function getUserCount() public view returns (uint256 count) {
        return _userList.length();
    }

    function getUserList() public view returns (address[] memory userList) {
        return _userList.values();
    }

    function _requestRandomWords(uint32 _numWords) internal returns (uint256 requestId) {
        return
            VRFCoordinatorV2Interface(_vrfCoordinator).requestRandomWords(
                _S_KEY_HASH,
                subscriptionId,
                _S_REQUEST_CONFIRMATIONS,
                _S_CALLBACK_GAS_LIMIT,
                _numWords
            );
    }

    /**
     * @notice fulfillRandomness handles the VRF response. Your contract must
     * @notice implement it. See "SECURITY CONSIDERATIONS" above for important
     * @notice principles to keep in mind when implementing your fulfillRandomness
     * @notice method.
     *
     * @dev VRFConsumerBaseV2 expects its subcontracts to have a method with this
     * @dev signature, and will call it once it has verified the proof
     * @dev associated with the randomness. (It is triggered via a call to
     * @dev rawFulfillRandomness, below.)
     *
     * @param _randomWords the VRF output expanded to the requested number of words
     */
    function _fulfillRandomWords(uint256 /*_requestId*/, uint256[] memory _randomWords) internal {
        // since we'll use the random word in the reverse order, push the last random word first
        uint256 length = _randomWords.length;
        for (uint256 i = 0; i < length; ) {
            randomWordList.push(_randomWords[length - 1 - i]);

            unchecked {
                ++i;
            }
        }

        // select winners
        _selectWinners();
    }

    function _selectWinners() internal returns (bool isWinner) {
        // get the random word and remove it from the list
        uint256 randomWord = randomWordList[randomWordList.length - 1];
        randomWordList.pop();

        // select the winner
        uint256 winnerTicketId = 0;
        bool winnerFound = false;
        for (uint256 i = 0; i < totalTicketCount; ++i) {
            winnerTicketId = randomWord % totalTicketCount;

            if (!isWinnerTicketId[winnerTicketId]) {
                winnerFound = true;
                break;
            }

            if (randomWordList.length == 0) {
                return false;
            } else {
                randomWord = randomWordList[randomWordList.length - 1];
                randomWordList.pop();
            }
        }

        if (!winnerFound) {
            return false;
        }

        address[] memory users = getUserList();
        uint256 statIndexToCheck = 0;
        uint256 endIndexToCheck = getUserCount() - 1;
        uint256 userIndexToCheck;
        address userToCheck;
        address winner;
        while (statIndexToCheck <= endIndexToCheck) {
            userIndexToCheck = (statIndexToCheck + endIndexToCheck) / 2;
            userToCheck = users[userIndexToCheck];

            if (
                ticketRangeByUser[userToCheck].startTicketId <= winnerTicketId &&
                winnerTicketId <= ticketRangeByUser[userToCheck].endTicketId
            ) {
                winner = userToCheck;
                break;
            } else if (winnerTicketId < ticketRangeByUser[userToCheck].startTicketId) {
                endIndexToCheck = userIndexToCheck - 1;
            } else {
                statIndexToCheck = userIndexToCheck + 1;
            }
        }

        // transfer the prize
        uint256 prizeTokenId = prizeNFTokenIds[currentWinnerTicketCount];
        isWinnerTicketId[winnerTicketId] = true;

        // store the winner
        winners.push(WinnerInfo({ticketId: winnerTicketId, winner: winner, prizeTokenId: prizeTokenId}));

        emit WinnerSelected(msg.sender, winner, winnerTicketId, prizeTokenId);

        // increase the current winner ticket count
        ++currentWinnerTicketCount;

        prizeNFT.safeTransferFrom(address(this), winner, prizeTokenId, bytes(""));

        return true;
    }

    // Create a new subscription when the contract is initially deployed.
    function _createNewSubscription() private {
        subscriptionId = VRFCoordinatorV2Interface(_vrfCoordinator).createSubscription();
        VRFCoordinatorV2Interface(_vrfCoordinator).addConsumer(subscriptionId, address(this));
    }
}
