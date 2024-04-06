// SPDX-License-Identifier: MIT

pragma solidity 0.8.25;

import {Ownable} from "@openzeppelin/contracts/v4/access/Ownable.sol";

/**
 * @title AllowedColorsStorage
 * @dev Color indexes need to be restricted per tribe prior to NFT deploy
 */
contract AllowedColorsStorage is Ownable {
    /// @dev Mapping if color is allowed for selected tribe
    mapping(uint256 tribe => mapping(uint256 color => bool allowed)) private _tribeColorAllowed;

    error InvalidTribe(uint256 tribe, string message);

    /**
     * @notice Set allowed on a given a list of colors
     * @param tribe Tribe ID 1-10
     * @param colors List of colors to set for tribe
     * @param allowed Bool if the color list should be made allowed or not
     */
    function setAllowedColorsOnTribe(uint256 tribe, uint256[] calldata colors, bool allowed) external onlyOwner {
        if (tribe < 1 || tribe > 9) {
            revert InvalidTribe(tribe, "Invalid tribe provided");
        }
        uint256 length = colors.length;
        for (uint256 i = 0; i < length; ++i) {
            _toggleColorAllowed(tribe, colors[i], allowed);
        }
    }

    /**
     * @notice Check if color is allowed for a tribe
     * @param tribe Tribe ID
     * @param color Trait ID
     * @return allowed if color is allowed for tribe
     */
    function isAllowedColor(uint256 tribe, uint256 color) public view returns (bool allowed) {
        return _tribeColorAllowed[tribe][color];
    }

    /**
     * @notice Toggle color allowed on and off for a tribe
     * @param tribe Tribe ID
     * @param color Trait ID
     * @param allowed Bool if the color should be made allowed or not
     * @dev Defaults to false if never set
     */
    function _toggleColorAllowed(uint256 tribe, uint256 color, bool allowed) private {
        _tribeColorAllowed[tribe][color] = allowed;
    }
}
