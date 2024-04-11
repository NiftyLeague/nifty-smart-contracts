// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

import {ERC20MetaTransactions} from "../lib/ERC20MetaTransactions.sol";
import {IChildERC20} from "../interfaces/IChildERC20.sol";

/**
 *   @title NFTL - ChildERC20
 *   @author @NiftyAndy, Nifty League, Immutable
 *   @notice Child token for ChildERC20 predicate deployments
 *   This contract is based on OpenZeppelin's ERC20, ERC20Permit, ERC20Votes contracts for token governance.
 */

contract NFTL is ERC20, ERC20Permit, ERC20Votes, ERC20MetaTransactions, IChildERC20 {
    ///  @dev The bridge contract address
    address private immutable _BRIDGE;

    ///  @dev The root token contract address
    address private immutable _ROOT_TOKEN;

    error InvalidInitialization(string message);
    error Unauthorized(string message);

    /**
     * @dev Modifier that allows only the bridge contract to call the function.
     * Throws an `Unauthorized` error if called by any other address.
     */
    modifier onlyBridge() {
        if (_msgSender() != bridge()) revert Unauthorized("Only bridge can call");
        _;
    }

    constructor(
        address bridge_,
        address rootToken_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (bridge_ == address(0)) revert InvalidInitialization("Bridge address must be defined");
        if (rootToken_ == address(0)) revert InvalidInitialization("Token address must be defined");
        if (bytes(name_).length == 0) revert InvalidInitialization("Name cannot be empty");
        if (bytes(symbol_).length == 0) revert InvalidInitialization("Symbol cannot be empty");
        _BRIDGE = bridge_;
        _ROOT_TOKEN = rootToken_;
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
    function bridge() public view virtual returns (address) {
        return _BRIDGE;
    }

    /**
     * @inheritdoc IChildERC20
     */
    function rootToken() public view virtual returns (address) {
        return _ROOT_TOKEN;
    }

    /**
     * @inheritdoc ERC20Votes
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    /**
     * @inheritdoc ERC20Votes
     */
    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    /**
     * @inheritdoc ERC20Votes
     */
    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }

    /**
     * @inheritdoc ERC20MetaTransactions
     */
    function _msgSender() internal view virtual override(Context, ERC20MetaTransactions) returns (address) {
        return ERC20MetaTransactions._msgSender();
    }
}
