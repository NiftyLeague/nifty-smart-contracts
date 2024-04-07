// solhint-disable no-empty-blocks
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract MockStarkExchange {
    mapping(address acc => uint256 balance) private _balances;

    error InsufficientBalance();
    error DepositAmountMustBeGreaterThanZero();
    error WithdrawalAmountMustBeGreaterThanZero();

    function deposit() external payable {
        if (msg.value == 0) revert DepositAmountMustBeGreaterThanZero();
        _balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external returns (bool success, bytes memory data) {
        if (amount == 0) revert WithdrawalAmountMustBeGreaterThanZero();
        if (amount > _balances[msg.sender]) revert InsufficientBalance();

        _balances[msg.sender] -= amount;
        return msg.sender.call{value: amount}("");
    }
}
