// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IChildERC20} from "../interfaces/IChildERC20.sol";

/**
 *   @title NFTL - ChildERC20
 *   @author @0xPlayerOne, Nifty League, Immutable
 *   @notice Child token for ChildERC20 predicate deployments.
 *   This contract is based on OpenZeppelin's ERC20, ERC20Permit, ERC20Votes contracts for token governance.
 */

contract NFTL is ERC20, ERC20Burnable, AccessControl, ERC20Permit, ERC20Votes, IChildERC20 {
    ///  @dev The root token contract address
    address private immutable _ROOT_TOKEN;

    ///  @dev The role to assign bridge token manager for minting/burning
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    error InvalidInitialization(string message);

    /**
     * @dev Modifier that allows only the bridge contract to call the function.
     */
    modifier onlyBridge() {
        _checkRole(BRIDGE_ROLE);
        _;
    }

    constructor(
        address owner_,
        address rootToken_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (rootToken_ == address(0)) revert InvalidInitialization("Token address must be defined");
        if (bytes(name_).length == 0) revert InvalidInitialization("Name cannot be empty");
        if (bytes(symbol_).length == 0) revert InvalidInitialization("Symbol cannot be empty");
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        _ROOT_TOKEN = rootToken_;
    }

    /**
     * @inheritdoc IChildERC20
     */
    function mint(address to, uint256 amount) public virtual onlyBridge {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IChildERC20
     */
    function burn(address from, uint256 amount) public virtual onlyBridge {
        _burn(from, amount);
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
}
