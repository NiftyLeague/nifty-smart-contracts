// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721PresetMinterPauserAutoId {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    constructor() ERC721PresetMinterPauserAutoId("MockToken", "TESTTOKEN", "https://api.niftyleague.com/nfts") {}

    function mint(address to) public override {
        _mint(to, _tokenIdTracker.current());
        _tokenIdTracker.increment();
    }
}
