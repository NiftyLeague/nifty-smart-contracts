// SPDX-License-Identifier: MIT
// solhint-disable const-name-snakecase

pragma solidity 0.8.19;

library Bytes {
    bytes public constant alphabet = "0123456789abcdef";

    error InvalidInput();

    /**
     * @dev Converts a `uint256` to a `string`.
     * via OraclizeAPI - MIT licence
     * https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol
     */
    function fromUint(uint256 value) internal pure returns (string memory res) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            ++digits;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        uint256 index = digits - 1;
        temp = value;
        while (temp != 0) {
            buffer[--index] = bytes1(uint8(48 + (temp % 10)));
            temp /= 10;
        }
        return string(buffer);
    }

    /**
     * Index Of
     *
     * Locates and returns the position of a character within a string starting
     * from a defined offset
     *
     * @param _base When being used for a data type this is the extended object
     *              otherwise this is the string acting as the haystack to be
     *              searched
     * @param _value The needle to search for, at present this is currently
     *               limited to one character
     * @param _offset The starting point to start searching from which can start
     *                from 0, but must not exceed the length of the string
     * @return position The position of the needle starting from 0 and returning -1
     *             in the case of no matches found
     */
    function indexOf(
        bytes memory _base,
        string memory _value,
        uint256 _offset
    ) internal pure returns (int256 position) {
        bytes memory _valueBytes = bytes(_value);

        assert(_valueBytes.length == 1);

        uint256 length = _base.length;
        for (uint256 i = _offset; i < length; ++i) {
            if (_base[i] == _valueBytes[0]) {
                return int256(i);
            }
        }

        return -1;
    }

    function substring(
        bytes memory strBytes,
        uint256 startIndex,
        uint256 endIndex
    ) internal pure returns (string memory res) {
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; ++i) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function toUint(bytes memory b) internal pure returns (uint256 res) {
        uint256 result = 0;
        uint256 length = b.length;
        for (uint256 i = 0; i < length; ++i) {
            uint256 val = uint256(uint8(b[i]));
            if (val >= 48 && val <= 57) {
                // input is 0-9
                result = result * 10 + (val - 48);
            } else {
                // invalid character, expecting integer input
                revert InvalidInput();
            }
        }
        return result;
    }
}
