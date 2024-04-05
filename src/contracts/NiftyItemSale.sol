// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/security/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/v4/security/PausableUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC1155SupplyUpgradeable} from "./interfaces/IERC1155SupplyUpgradeable.sol";
import {IERC20PresetMinterPauserUpgradeable} from "./interfaces/IERC20PresetMinterPauserUpgradeable.sol";
import {INiftyEquipment} from "./interfaces/INiftyEquipment.sol";

contract NiftyItemSale is OwnableUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @dev NiftyItems address
    address public items;

    /// @dev NFTL token address
    address public nftl;

    /// @dev ItemID -> NFTL token amount (price)
    mapping(uint256 itemId => uint256 amount) public itemPrices;

    /// @dev ItemID -> Max count
    mapping(uint256 itemId => uint256 count) public itemMaxCounts;

    /// @dev ItemID -> Item count limit per address
    mapping(uint256 itemId => uint256 limit) public itemLimitPerAdress;

    /// @dev Treasury address
    address public treasury;

    /// @dev DAO address
    address public dao;

    /// @dev NFTL token burn percentage
    uint256 public burnPercentage;

    /// @dev NFTL token percentage to the treasury
    uint256 public treasuryPercentage;

    /// @dev NFTL token percentage to the DAO
    uint256 public daoPercentage;

    event ItemPurchased(address indexed by, uint256[] itemIds, uint256[] amounts);
    event ItemPriceSet(address indexed by, uint256 itemId, uint256 oldItemPrice, uint256 newItemPrice);
    event ItemMaxCountSet(address indexed by, uint256 itemId, uint256 oldItemMaxCount, uint256 newItemMaxCount);
    event TokenPercentagesUpdated(
        address indexed by,
        uint256 oldBurnPercentage,
        uint256 oldTreasuryPercentage,
        uint256 oldDAOPercentage,
        uint256 newBurnPercentage,
        uint256 newTreasuryPercentage,
        uint256 newDAOPercentage
    );
    event ItemLimitUpdated(address indexed by, uint256 itemId, uint256 oldLimitCount, uint256 newLimitCount);
    event NFTLWithdraw(address indexed by, uint256 burnAmount, uint256 treasuryAmount, uint256 daoAmount);

    error AddressError(string message);
    error InputError(string message);

    function initialize(
        address _items,
        address _nftl,
        address _treasury,
        address _dao,
        uint256 _burnPercentage,
        uint256 _treasuryPercentage,
        uint256 _daoPercentage
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        if (_burnPercentage + _treasuryPercentage + _daoPercentage != 1000) revert InputError("Invalid percentages");

        if (_items == address(0)) revert AddressError("Invalid items address");
        if (_nftl == address(0)) revert AddressError("Invalid nftl address");
        if (_treasury == address(0)) revert AddressError("Invalid treasury address");
        if (_dao == address(0)) revert AddressError("Invalid dao address");

        items = _items;
        nftl = _nftl;
        treasury = _treasury;
        dao = _dao;
        burnPercentage = _burnPercentage;
        treasuryPercentage = _treasuryPercentage;
        daoPercentage = _daoPercentage;
    }

    /**
     * @notice Purchase items
     * @dev User can purchase the several items at once
     * @dev Item total supply can't exceed the max count
     * @dev Item price is set using the NFTL token amount
     * @param _itemIds Item ID list
     * @param _amounts Item amount list
     */
    function purchaseItems(
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    ) external nonReentrant whenNotPaused {
        uint256 length = _itemIds.length;
        if (length != _amounts.length) revert InputError("Mismatched params");

        // get total price and check the limit
        uint256 totalPrice;
        uint256 itemId;
        uint256 amount;
        for (uint256 i; i < length; ++i) {
            itemId = _itemIds[i];
            amount = _amounts[i];

            // check the price and max count
            if (itemPrices[itemId] == 0) revert InputError("Zero price");
            if (amount > getRemainingItemCount(itemId)) revert InputError("Remaining count overflow");

            // check the item limit if it's set
            uint256 itemLimitCount = itemLimitPerAdress[itemId];
            if (itemLimitCount > 0) {
                uint256 userBalance = IERC1155SupplyUpgradeable(items).balanceOf(msg.sender, itemId);
                if (userBalance + amount > itemLimitCount) revert InputError("Item limit overflow");
            }

            totalPrice += itemPrices[itemId] * amount;
        }

        // purchase items
        IERC20Upgradeable(nftl).safeTransferFrom(msg.sender, address(this), totalPrice);
        INiftyEquipment(items).mintBatch(msg.sender, _itemIds, _amounts, bytes(""));

        emit ItemPurchased(msg.sender, _itemIds, _amounts);
    }

    /**
     * @notice Set item prices
     * @dev Only owner
     * @dev Owner can set the several item prices at once
     * @dev Item price can't be less than 1 NFTL
     * @param _itemIds Item ID list
     * @param _nftlAmounts Item price list specified by the NFTL token amounts
     */
    function setItemPrices(uint256[] calldata _itemIds, uint256[] calldata _nftlAmounts) external onlyOwner {
        uint256 length = _itemIds.length;
        if (length != _nftlAmounts.length) revert InputError("Mismatched params");

        // set the item price
        for (uint256 i; i < length; ++i) {
            if (_itemIds[i] <= 6) revert InputError("Token ID less than 7");
            if (_nftlAmounts[i] < 10 ** 18) revert InputError("Price less than 1 NFTL");

            emit ItemPriceSet(msg.sender, _itemIds[i], itemPrices[_itemIds[i]], _nftlAmounts[i]);

            itemPrices[_itemIds[i]] = _nftlAmounts[i];
        }
    }

    /**
     * @notice Set the item max counts
     * @dev Only owner
     * @dev Owner can set the several item max counts at once and itemId must be greater than 6
     * @dev Max count can't be less than the current total supply
     * @param _itemIds Item ID list
     * @param _maxCounts Item max count list
     */
    function setItemMaxCounts(uint256[] calldata _itemIds, uint256[] calldata _maxCounts) external onlyOwner {
        uint256 length = _itemIds.length;
        if (length != _maxCounts.length) revert InputError("Mismatched params");

        // set the item max count
        for (uint256 i; i < length; ++i) {
            // check item ID
            if (_itemIds[i] <= 6) revert InputError("Token ID less than 7");

            // check if the max count is smaller than the current total supply
            if (_maxCounts[i] < IERC1155SupplyUpgradeable(items).totalSupply(_itemIds[i]))
                revert InputError("Max count less than total supply");

            emit ItemMaxCountSet(msg.sender, _itemIds[i], itemMaxCounts[_itemIds[i]], _maxCounts[i]);

            itemMaxCounts[_itemIds[i]] = _maxCounts[i];
        }
    }

    /**
     * @notice Update the token distribution percentages
     * @dev Only owner
     * @dev Max percentage is 1000
     * @param _burnPercentage Percentage to burn
     * @param _treasuryPercentage Percentage to the treasury address
     * @param _daoPercentage Percentage to the DAO address
     */
    function updateTokenPercentages(
        uint256 _burnPercentage,
        uint256 _treasuryPercentage,
        uint256 _daoPercentage
    ) external onlyOwner {
        if (_burnPercentage + _treasuryPercentage + _daoPercentage != 1000) revert InputError("Invalid percentages");

        emit TokenPercentagesUpdated(
            msg.sender,
            burnPercentage,
            treasuryPercentage,
            daoPercentage,
            _burnPercentage,
            _treasuryPercentage,
            _daoPercentage
        );

        // update the percentages
        burnPercentage = _burnPercentage;
        treasuryPercentage = _treasuryPercentage;
        daoPercentage = _daoPercentage;
    }

    /**
     * @notice Limit the number of the specific items per address
     * @dev Setting _limitCount to 0 means no limit
     * @dev Only owner
     * @param _itemId Item ID to limit
     * @param _limitCount Limit number
     */
    function setItemLimit(uint256 _itemId, uint256 _limitCount) external onlyOwner {
        emit ItemLimitUpdated(msg.sender, _itemId, itemLimitPerAdress[_itemId], _limitCount);

        itemLimitPerAdress[_itemId] = _limitCount;
    }

    /**
     * @notice Withdraw NFTL tokens locked on the contract
     * @dev Only owner
     * @dev Some of tokens are burnt and the remaing ones are transferred to the treasury and DAO addresses
     */
    function withdraw() external onlyOwner {
        uint256 nftlBalance = IERC20Upgradeable(nftl).balanceOf(address(this));

        // get the burnAmount, treasuryAmount and daoAmount
        uint256 burnAmount = (nftlBalance * burnPercentage) / 1000;
        uint256 treasuryAmount = (nftlBalance * treasuryPercentage) / 1000;
        uint256 daoAmount = nftlBalance - burnAmount - treasuryAmount;

        emit NFTLWithdraw(msg.sender, burnAmount, treasuryAmount, daoAmount);

        // trasnfer tokens
        IERC20PresetMinterPauserUpgradeable(nftl).burn(burnAmount);
        IERC20Upgradeable(nftl).safeTransfer(treasury, treasuryAmount);
        IERC20Upgradeable(nftl).safeTransfer(dao, daoAmount);
    }

    /**
     * @notice Pause the sale
     * @dev Only owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the sale
     * @dev Only owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get the remaining item count to be able to purchase
     * @param _itemId Item ID
     * @return count (uint256) Remaining item amount able to purchase
     */
    function getRemainingItemCount(uint256 _itemId) public view returns (uint256 count) {
        return itemMaxCounts[_itemId] - IERC1155SupplyUpgradeable(items).totalSupply(_itemId);
    }
}
