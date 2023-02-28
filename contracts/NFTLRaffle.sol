// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

interface IERC20BurnableUpgradeable is IERC20Upgradeable {
    function burnFrom(address account, uint256 amount) external;
}

/**
 * @title NFTLRaffle
 */
contract NFTLRaffle is Initializable, OwnableUpgradeable, PausableUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    event UserDeposited(address indexed user, uint256 nftlAmount);
    event WinnerSelected(address indexed by, address indexed winner, uint256 ticketId);

    error OnlyCoordinatorCanFulfill(address have, address want);

    struct WinnerInfo {
        uint256 ticketId;
        address winner;
    }

    /// @dev Chainlink VRF params
    address private vrfCoordinator; // goerli: 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D, etherscan: 0x271682DEB8C4E0901D1a1550aD2e64D568E69909
    address private constant LINK = 0x326C977E6efc84E512bB9C30f76E30c160eD06FB; // 0x514910771AF9Ca656af840dff83E8264EcF986CA
    bytes32 private constant s_keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15; // 0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef
    uint16 private constant s_requestConfirmations = 3;
    uint32 private constant s_callbackGasLimit = 2500000;
    uint64 public s_subscriptionId;

    /// @dev NFTL address
    IERC20BurnableUpgradeable public nftl;

    /// @dev Timestamp the raffle start
    uint256 public raffleStartAt;

    /// @dev Winner count
    uint256 public totalWinnerTicketCount;

    /// @dev Winner list
    WinnerInfo[] public winners;

    /// @dev Total ticket count
    uint256 public totalTicketCount;

    /// @dev NFTL amount required for 1 ticket
    uint256 public constant NFTL_AMOUNT_FOR_TICKET = 1000 * 10 ** 18;

    /// @dev User list
    EnumerableSetUpgradeable.AddressSet internal _userList;

    /// @dev TokenId list
    EnumerableSetUpgradeable.UintSet internal _ticketIdList;

    /// @dev User -> NFTL amount deposited
    mapping(address => uint256) public userDeposits;

    /// @dev User -> Ticket Id list
    mapping(address => EnumerableSetUpgradeable.UintSet) internal _ticketIdsByUser;

    /// @dev Ticket Id -> User
    mapping(uint256 => address) public userByTicketId;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _nftl,
        uint256 _pendingPeriod,
        uint256 _totalWinnerTicketCount,
        address _vrfCoordinator
    ) public initializer {
        __Ownable_init();
        __Pausable_init();

        require(_nftl != address(0), "Zero address");
        require(_pendingPeriod > 86400, "1 day +");
        require(_totalWinnerTicketCount > 0, "Zero winner ticket count");

        nftl = IERC20BurnableUpgradeable(_nftl);
        raffleStartAt = block.timestamp + _pendingPeriod;
        totalWinnerTicketCount = _totalWinnerTicketCount;
        vrfCoordinator = _vrfCoordinator;

        _createNewSubscription();
    }

    function updateRaffleStartAt(uint256 _raffleStartAt) external onlyOwner {
        require(block.timestamp < _raffleStartAt, "Invalid timestamp");
        raffleStartAt = _raffleStartAt;
    }

    function updateTotalWinnerTicketCount(uint256 _totalWinnerTicketCount) external onlyOwner {
        require(_totalWinnerTicketCount > 0, "Zero winner ticket count");
        totalWinnerTicketCount = _totalWinnerTicketCount;
    }

    function deposit(uint256 _amount) external {
        require(block.timestamp < raffleStartAt, "Expired");

        // burn NFTL tokens
        nftl.burnFrom(msg.sender, _amount);

        // increase the user deposit
        userDeposits[msg.sender] += _amount;

        // add the user if not exist
        _userList.add(msg.sender);

        // assign the tickets (user <-> ticketId)
        uint256 userTicketCount = getTicketCountByUser(msg.sender);
        uint256 userTicketCountToAssign = userDeposits[msg.sender] / NFTL_AMOUNT_FOR_TICKET - userTicketCount;
        uint256 baseTicketId = totalTicketCount;
        for (uint256 i = 0; i < userTicketCountToAssign; ) {
            uint256 ticketIdToAssign = baseTicketId + i;

            // add the ticket Id
            _ticketIdList.add(ticketIdToAssign);

            // user -> ticket Ids
            _ticketIdsByUser[msg.sender].add(ticketIdToAssign);

            // ticket ID -> user
            userByTicketId[ticketIdToAssign] = msg.sender;

            unchecked {
                ++i;
            }
        }

        // increase the total ticket count
        totalTicketCount += userTicketCountToAssign;

        emit UserDeposited(msg.sender, _amount);
    }

    function selectWinners() external onlyOwner {
        require(raffleStartAt <= block.timestamp, "Pending period");
        require(totalWinnerTicketCount <= _ticketIdList.length(), "Not enough depositors");

        for (uint256 i = 0; i < totalWinnerTicketCount; ) {
            // select the winner
            bytes32 randomHash = keccak256(
                abi.encodePacked(
                    blockhash(block.number),
                    msg.sender,
                    block.timestamp,
                    block.difficulty,
                    i * totalWinnerTicketCount
                )
            );
            uint256 winnerTicketIndex = uint256(randomHash) % _ticketIdList.length();
            uint256 winnerTicketId = _ticketIdList.at(winnerTicketIndex);
            address winner = userByTicketId[winnerTicketId];

            // store the winner
            winners.push(WinnerInfo({ ticketId: winnerTicketId, winner: winner }));

            // remove the selected ticket Id from the list
            _ticketIdList.remove(winnerTicketId);

            emit WinnerSelected(msg.sender, winner, winnerTicketId);

            unchecked {
                ++i;
            }
        }
    }

    function getWinners() external view returns (WinnerInfo[] memory) {
        return winners;
    }

    function getUserCount() external view returns (uint256) {
        return _userList.length();
    }

    function getTicketIdsByUser(address _user) external view returns (uint256[] memory) {
        return _ticketIdsByUser[_user].values();
    }

    function getTicketCountByUser(address _user) public view returns (uint256) {
        return _ticketIdsByUser[_user].length();
    }

    function getUserList() external view returns (address[] memory) {
        return _userList.values();
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

    function chargeLINK(uint256 amount) external {
        IERC20Upgradeable(LINK).safeTransferFrom(msg.sender, address(this), amount);
        LinkTokenInterface(LINK).transferAndCall(vrfCoordinator, amount, abi.encode(s_subscriptionId));
    }

    function requestRandomWords(uint32 numWords) internal returns (uint256) {
        return
            VRFCoordinatorV2Interface(vrfCoordinator).requestRandomWords(
                s_keyHash,
                s_subscriptionId,
                s_requestConfirmations,
                s_callbackGasLimit,
                numWords
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
     * @param requestId The Id initially returned by requestRandomWords
     * @param randomWords the VRF output expanded to the requested number of words
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;

    // rawFulfillRandomness is called by VRFCoordinator when it receives a valid VRF
    // proof. rawFulfillRandomness then calls fulfillRandomness, after validating
    // the origin of the call
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        if (msg.sender != vrfCoordinator) {
            revert OnlyCoordinatorCanFulfill(msg.sender, vrfCoordinator);
        }
        fulfillRandomWords(requestId, randomWords);
    }

    function manageConsumers(address consumer, bool add) external onlyOwner {
        add
            ? VRFCoordinatorV2Interface(vrfCoordinator).addConsumer(s_subscriptionId, consumer)
            : VRFCoordinatorV2Interface(vrfCoordinator).removeConsumer(s_subscriptionId, consumer);
    }

    function cancelSubscription() external onlyOwner {
        VRFCoordinatorV2Interface(vrfCoordinator).cancelSubscription(s_subscriptionId, owner());
        s_subscriptionId = 0;
    }

    // Create a new subscription when the contract is initially deployed.
    function _createNewSubscription() private {
        s_subscriptionId = VRFCoordinatorV2Interface(vrfCoordinator).createSubscription();
        VRFCoordinatorV2Interface(vrfCoordinator).addConsumer(s_subscriptionId, address(this));
    }
}
