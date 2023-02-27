// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

interface IERC20BurnableUpgradeable is IERC20Upgradeable {
    function burnFrom(address account, uint256 amount) external;
}

/**
 * @title NFTLRaffle
 */
contract NFTLRaffle is Initializable, OwnableUpgradeable, PausableUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    struct WinnerInfo {
        uint256 ticketId;
        address winner;
    }

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

    function initialize(address _nftl, uint256 _pendingPeriod, uint256 _totalWinnerTicketCount) public initializer {
        __Ownable_init();
        __Pausable_init();

        require(_nftl != address(0), "Zero address");
        require(_pendingPeriod > 86400, "1 day +");
        require(_totalWinnerTicketCount > 0, "Zero winner ticket count");

        nftl = IERC20BurnableUpgradeable(_nftl);
        raffleStartAt = block.timestamp + _pendingPeriod;
        totalWinnerTicketCount = _totalWinnerTicketCount;
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

            // store the winner
            winners.push(WinnerInfo({ ticketId: winnerTicketId, winner: userByTicketId[winnerTicketId] }));

            // remove the selected ticket Id from the list
            _ticketIdList.remove(winnerTicketId);

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
}
