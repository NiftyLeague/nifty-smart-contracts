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
 *   @author @NiftyAndy, Nifty League, Polygon Technology (@QEDK)
 *   @notice Child token for ChildERC20 predicate deployments
 *   This contract is based on OpenZeppelin's ERC20, ERC20Permit, ERC20Votes contracts for token governance.
 */

contract NFTL is ERC20, ERC20Permit, ERC20Votes, ERC20MetaTransactions, IChildERC20 {
    ///  @dev The bridge contract address
    address private _bridge;

    ///  @dev The root token contract address
    address private _rootToken;

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

    constructor(
        address rootToken_,
        address bridge_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (rootToken_ == address(0)) revert InvalidInitialization("Token address must be defined");
        if (bytes(name_).length == 0) revert InvalidInitialization("Name cannot be empty");
        if (bytes(symbol_).length == 0) revert InvalidInitialization("Symbol cannot be empty");
        _rootToken = rootToken_;
        _bridge = bridge_;
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
     * @dev Internal function that is called after a token transfer.
     * It calls the _afterTokenTransfer function from the ERC20 and ERC20Votes contracts.
     * @param from The address transferring the tokens.
     * @param to The address receiving the tokens.
     * @param amount The amount of tokens being transferred.
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    /**
     * @dev Internal function that mints new tokens.
     * It calls the _mint function from the ERC20 and ERC20Votes contracts.
     * @param to The address receiving the minted tokens.
     * @param amount The amount of tokens to mint.
     */
    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    /**
     * @dev Internal function that burns tokens.
     * It calls the _burn function from the ERC20 and ERC20Votes contracts.
     * @param account The address from which tokens are burned.
     * @param amount The amount of tokens to burn.
     */
    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }

    /**
     * @dev Returns the address of the message sender to enable meta transactions execution on behalf of the user.
     * Overrides the internal _msgSender() function from ERC20 Context with ERC20MetaTransactions.
     * @return address address of the message sender.
     */
    function _msgSender() internal view virtual override(Context, ERC20MetaTransactions) returns (address) {
        return ERC20MetaTransactions._msgSender();
    }
}
