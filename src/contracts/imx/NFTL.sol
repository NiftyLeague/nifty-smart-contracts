// Copyright Immutable Pty Ltd 2018 - 2023
// SPDX-License-Identifier: Apache 2.0

pragma solidity 0.8.19;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import {EIP712MetaTransaction} from "../lib/EIP712MetaTransaction.sol";
import {IChildERC20} from "../interfaces/IChildERC20.sol";

/**
 *   @title NFTL - ChildERC20
 *   @author @NiftyAndy, Nifty League, Polygon Technology (@QEDK)
 *   @notice Child token template for ChildERC20 predicate deployments
 *   @dev All child tokens are clones of this contract. Burning and minting is controlled by the ChildERC20Bridge.
 *
 *   @dev Upgradability:
 *        This contract is deployed using cloneDeterministic. It is then initialized using an initialize function.
 *        However, the contract is accessed directly, and not via a transparent upgrade proxy. As such, this contract is not upgradeable.
 *
 *   @dev Cloning and Initialization:
 *        During the bootstrap process this contract is deployed on-chain.
 *        When a token is initially mapped by the ChildERC20Bridge the deployed contract is cloned by the ChildERC20Bridge to a deterministic address.
 *        The new ChildERC20 token is created using cloneDeterministic with the keccak256 hash of the rootToken's address as the salt.
 *        This new ChildERC20 token is then initialized with the same name, symbol and decimals as the rootToken.
 *        This deterministic cloning approach allows the token mapping on the root and child bridges to stay congruent.
 */

contract ChildERC20 is EIP712MetaTransaction, ERC20Upgradeable, IChildERC20 {
    ///  @dev The bridge contract address
    address private _bridge;

    ///  @dev The root token contract address
    address private _rootToken;

    ///  @dev The number of decimals for the token
    uint8 private _decimals;

    error InvalidInitialization(string message);
    error Unauthorized(string message);

    /**
     * @dev Modifier that allows only the bridge contract to call the function.
     * Throws an `Unauthorized` error if called by any other address.
     */
    modifier onlyBridge() {
        if (msg.sender != _bridge) revert Unauthorized("Only bridge can call");
        _;
    }

    /**
     * @inheritdoc IChildERC20
     */
    function initialize(
        address rootToken_,
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_
    ) external initializer {
        if (rootToken_ == address(0)) revert InvalidInitialization("Token address must be defined");
        if (bytes(name_).length == 0) revert InvalidInitialization("Name cannot be empty");
        if (bytes(symbol_).length == 0) revert InvalidInitialization("Symbol cannot be empty");
        _rootToken = rootToken_;
        _decimals = decimals_;
        _bridge = msg.sender;
        __ERC20_init(name_, symbol_);
        _initializeEIP712(name_, "1");
    }

    /**
     * @inheritdoc IChildERC20
     */
    function mint(address account, uint256 amount) external virtual onlyBridge returns (bool) {
        _mint(account, amount);

        return true;
    }

    /**
     * @inheritdoc IChildERC20
     */
    function burn(address account, uint256 amount) external virtual onlyBridge returns (bool) {
        _burn(account, amount);

        return true;
    }

    /**
     * @inheritdoc IChildERC20
     */
    function bridge() external view virtual returns (address) {
        return _bridge;
    }

    /**
     * @inheritdoc IChildERC20
     */
    function rootToken() external view virtual returns (address) {
        return _rootToken;
    }

    /**
     * @inheritdoc ERC20Upgradeable
     * @notice Returns the decimals places of the token
     * @return uint8 Returns the decimals places of the token.
     */
    function decimals() public view virtual override(ERC20Upgradeable, IERC20MetadataUpgradeable) returns (uint8) {
        return _decimals;
    }

    /**
     * @inheritdoc ContextUpgradeable
     * @notice Returns the address of the sender of the message
     * @return address Returns the address of the sender of the message.
     */
    function _msgSender() internal view virtual override(EIP712MetaTransaction, ContextUpgradeable) returns (address) {
        return EIP712MetaTransaction._msgSender();
    }
}
