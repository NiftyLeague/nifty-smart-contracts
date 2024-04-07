// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {VRFCoordinatorV2Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol";

contract MockVRFCoordinator is VRFCoordinatorV2Mock {
    constructor() VRFCoordinatorV2Mock(100, 100) {}
}
