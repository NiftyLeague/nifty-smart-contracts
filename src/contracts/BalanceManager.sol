// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import { Initializable } from "@openzeppelin/contracts-upgradeable/v4/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/v4/access/OwnableUpgradeable.sol";
import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/IERC20Upgradeable.sol";
import { SafeERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/v4/token/ERC20/utils/SafeERC20Upgradeable.sol";
import { ECDSAUpgradeable } from "@openzeppelin/contracts-upgradeable/v4/utils/cryptography/ECDSAUpgradeable.sol";

contract BalanceManager is Initializable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using ECDSAUpgradeable for bytes32;

    /// @dev NFTL token address
    address public nftl;

    /// @dev User -> Total deposit amount
    mapping(address user => uint256 amount) private _userDeposits;

    /// @dev User -> Total withdrawal amount
    mapping(address user => uint256 amount) private _userWithdrawals;

    /// @dev User -> Nonce
    mapping(address user => uint256 nonce) public nonce;

    /// @dev Signature -> Bool
    mapping(bytes signature => bool used) public signatures;

    /// @dev Maintainer address
    address public maintainer;

    event NFTLDeposited(address indexed by, uint256 amount);
    event MaintainerUpdated(address indexed by, address indexed oldMaintainer, address indexed newMaintainer);
    event NFTLWithdrawn(address indexed by, address indexed beneficiary, uint256 amount);
    event NFTLWithdrawnByDAO(address indexed by, address indexed beneficiary, uint256 amount);

    error WithdrawError(uint256 nonce, uint256 _nonce, string message);
    error SignError(string message);
    error AddressError(string message);

    function initialize(address _nftl, address _maintainer) public initializer {
        __Ownable_init();

        if (_nftl == address(0)) revert AddressError("Invalid NFTL token address");
        if (_maintainer == address(0)) revert AddressError("Invalid maintainer address");

        nftl = _nftl;
        maintainer = _maintainer;
    }

    /**
     * @notice Deposit NFTL tokens into the contract
     * @param _amount Deposit amount
     */
    function deposit(uint256 _amount) external {
        IERC20Upgradeable(nftl).safeTransferFrom(msg.sender, address(this), _amount);
        _userDeposits[msg.sender] += _amount;

        emit NFTLDeposited(msg.sender, _amount);
    }

    /**
     * @notice Withdraw NFTL tokens from the contract to the user
     * @param _amount NFTL token amount to withdraw
     * @param _nonce Nonce
     * @param _expireAt Expiration time
     * @param _signature Signature
     */
    function withdraw(uint256 _amount, uint256 _nonce, uint256 _expireAt, bytes calldata _signature) external {
        // check if the nonce is matched
        if (nonce[msg.sender] != _nonce) {
            revert WithdrawError(nonce[msg.sender], _nonce, "mismatched nonce");
        }
        ++nonce[msg.sender];

        // check if the request is not expired
        if (block.timestamp > _expireAt) {
            revert WithdrawError(block.timestamp, _expireAt, "expired withdrawal request");
        }

        // check if the signature was already used
        if (signatures[_signature]) revert SignError("used signature");
        signatures[_signature] = true;

        // check the signer
        bytes32 data = keccak256(abi.encodePacked(msg.sender, _amount, _nonce, _expireAt));
        if (data.toEthSignedMessageHash().recover(_signature) != maintainer) {
            revert SignError("wrong signer");
        }

        // update the withdrawal amount
        _userWithdrawals[msg.sender] += _amount;

        emit NFTLWithdrawn(msg.sender, msg.sender, _amount);

        // transfer tokens to the user
        IERC20Upgradeable(nftl).safeTransfer(msg.sender, _amount);
    }

    /**
     * @notice Update maintianer address
     * @dev Only owner
     * @param _maintainer New maintainer address
     */
    function updateMaintainer(address _maintainer) external onlyOwner {
        if (_maintainer == address(0)) revert AddressError("Invalid maintainer address");
        emit MaintainerUpdated(msg.sender, maintainer, _maintainer);

        maintainer = _maintainer;
    }

    /**
     * @notice Allow DAO to withdraw NFTL token from the contract
     * @dev Only owner
     * @param _beneficiary Beneficiary address
     * @param _amount NFTL token amount to withdraw
     */
    function withdrawByDAO(address _beneficiary, uint256 _amount) external onlyOwner {
        emit NFTLWithdrawnByDAO(msg.sender, _beneficiary, _amount);
        IERC20Upgradeable(nftl).safeTransfer(_beneficiary, _amount);
    }
}
