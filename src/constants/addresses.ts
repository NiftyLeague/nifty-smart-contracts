import { ContractAddressRecord } from '../types';

// #=============================================
// # NIFTY WALLETS
// #=============================================

export const NIFTY_DAO_SAFE = '0xd06Ae6fB7EaDe890f3e295D69A6679380C9456c1';

export const NIFTY_TEAM_SAFE = '0xB08446632BaA6466330a6885dEc3A9B383030Cee';

export const NIFTY_LEDGER_DEPLOYER = '0x87e1237074760F57b424121edcA06F082700dBC2';

export const NIFTY_HOT_DEPLOYER = '0x6C287e19065661Ca590A11CF0b419d1434991B67';

export const BALANCE_MANAGER_MAINTAINER = '0xD540805EEe3Ab4551040ba7b50D8Dc4c892a1d8E';

export const NIFTY_DAO_LEDGER = '0x217580dDDFD4e96CfD05A611378ba920FfcE3cb8';

export const NIFTY_MARKETING = '0x5c009bc2037AF68ee9C0474DDb028927eD814B65';

export const NIFTY_ANDY = '0x594f49b52400DB1D87c7dB3F784Be20D50972ae0';

export const SNARFY = '0xB970e591772F2CEb482bcD03a8d2f1924a4044Ce';

export const NIFTY_SPIKE = '0x1ee7D52a08A7e481c93769492ac728dA07508990';

export const MINT_TARGETS = [
  NIFTY_DAO_SAFE,
  NIFTY_TEAM_SAFE,
  NIFTY_LEDGER_DEPLOYER,
  NIFTY_HOT_DEPLOYER,
  NIFTY_ANDY,
  SNARFY,
  NIFTY_SPIKE,
];

// #=============================================
// # EXTERNAL WALLETS
// #=============================================

export const BURN_ADDY1 = '0x000000000000000000000000000000000000dEaD';
export const BURN_ADDY2 = '0x0000000000000000000000000000000000000001';

// #=============================================
// # ERC20 TOKENS
// #=============================================

export const WETH_TOKEN_ADDRESS: ContractAddressRecord = {
  mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  sepolia: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
  'imtbl-zkevm-mainnet': '0x52a6c53869ce09a731cd772f245b97a4401d3348',
  'imtbl-zkevm-testnet': '0xe9E96d1aad82562b7588F03f49aD34186f996478',
};

export const IMX_TOKEN_ADDRESS: ContractAddressRecord = {
  mainnet: '0xf57e7e7c23978c3caec3c3548e3d615c346e79ff',
  sepolia: '0xe2629e08f4125d14e446660028bd98ee60ee69f2',
  'imtbl-zkevm-mainnet': '0x3a0c2ba54d6cbd3121f01b96dfd20e99d1696c9d',
  'imtbl-zkevm-testnet': '0x1CcCa691501174B4A623CeDA58cC8f1a76dc3439',
};

export const LINK_TOKEN_ADDRESS: ContractAddressRecord = {
  mainnet: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  sepolia: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  'imtbl-zkevm-mainnet': '',
  'imtbl-zkevm-testnet': '',
};

export const USDC_TOKEN_ADDRESS: ContractAddressRecord = {
  mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  sepolia: '0x40b87d235A5B010a20A241F15797C9debf1ecd01',
  'imtbl-zkevm-mainnet': '0x6de8aCC0D406837030CE4dd28e7c08C5a96a30d2',
  'imtbl-zkevm-testnet': '0x3B2d8A1931736Fc321C24864BceEe981B11c3c57',
};

export const NFTL_TOKEN_ADDRESS: ContractAddressRecord = {
  mainnet: '0x3c8D2FCE49906e11e71cB16Fa0fFeB2B16C29638',
  sepolia: '0x0d312E74ba71bff163A07DdD2b6847CefF49dD1e',
  'imtbl-zkevm-mainnet': '',
  'imtbl-zkevm-testnet': '',
};

// #=============================================
// # NIFTY CONTRACTS
// #=============================================

export const DEGEN_ADDRESS: ContractAddressRecord = {
  mainnet: '0x986aea67C7d6A15036e18678065eb663Fc5BE883',
  sepolia: '0x6adFF2BB4A465A885425e3bd4304A78BB659B12e',
  'imtbl-zkevm-mainnet': '',
  'imtbl-zkevm-testnet': '',
};

export const NIFTY_LAUNCH_COMICS_ADDRESS: ContractAddressRecord = {
  mainnet: '0xBc8542e65ab801f7c9e3edd23238d37a2e3972d6',
  sepolia: '0x4b2B807881794A50b6C236DB50D4702b20d76449',
  'imtbl-zkevm-mainnet': '',
  'imtbl-zkevm-testnet': '',
};

export const NIFTY_ITEM_L2_ADDRESS: ContractAddressRecord = {
  mainnet: '0xc21909b7E596000C01318668293A7DFB4B37A578',
  sepolia: '0xF1863D85095AA932de5BccEBE02Dac0b67303383',
  'imtbl-zkevm-mainnet': '',
  'imtbl-zkevm-testnet': '',
};

// #=============================================
// # CHAINLINK CONTRACTS - https://docs.chain.link/vrf/v2/direct-funding/supported-networks
// #=============================================

export const VRF_WRAPPER_ADDRESS: ContractAddressRecord = {
  mainnet: '0x5A861794B927983406fCE1D062e00b9368d97Df6',
  sepolia: '0xab18414CD93297B0d12ac29E63Ca20f515b3DB46',
};

export const VRF_COORDINATOR_ADDRESS: ContractAddressRecord = {
  mainnet: '0x271682DEB8C4E0901D1a1550aD2e64D568E69909',
  sepolia: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
};

// #=============================================
// # IMX CONTRACTS - https://docs.immutable.com/docs/zkevm/architecture/addresses/
// #=============================================

// Immutable Chain
export const STARK_CONTRACT_ADDRESS: ContractAddressRecord = {
  mainnet: '0x5FDCCA53617f4d2b9134B29090C87D01058e27e9',
  sepolia: '0x2d5C349fD8464DA06a3f90b4B0E9195F3d1b7F98',
};

export const STARK_REGISTRATION_ADDRESS: ContractAddressRecord = {
  mainnet: '0x72a06bf2a1CE5e39cBA06c0CAb824960B587d64c',
  sepolia: '0xDbA6129C02E69405622fAdc3d5A7f8d23eac3b97',
};

// Root Chain: Ethereum (L1) | Child Chain: Immutable zkEVM (L2)
export const BRIDGE_PROXY_ADDRESS: ContractAddressRecord = {
  mainnet: '0xBa5E35E26Ae59c7aea6F029B68c6460De2d13eB6',
  sepolia: '0x0D3C59c779Fd552C27b23F723E80246c840100F5',
  'imtbl-zkevm-mainnet': '0xBa5E35E26Ae59c7aea6F029B68c6460De2d13eB6',
  'imtbl-zkevm-testnet': '0x0D3C59c779Fd552C27b23F723E80246c840100F5',
};

export const BRIDGE_IMPLEMENTATION_ADDRESS: ContractAddressRecord = {
  mainnet: '0x177EaFe0f1F3359375B1728dae0530a75C83E154',
  sepolia: '0xac88a57943b5BBa1ecd931F8494cAd0B7F717590',
  'imtbl-zkevm-mainnet': '0xb4c3597e6b090A2f6117780cEd103FB16B071A84',
  'imtbl-zkevm-testnet': '0xA554Cf58b9524d43F1dee2fE1b0C928f18A93FE9',
};

export const ADAPTER_PROXY_ADDRESS: ContractAddressRecord = {
  mainnet: '0x4f49B53928A71E553bB1B0F66a5BcB54Fd4E8932',
  sepolia: '0x6328Ac88ba8D466a0F551FC7C42C61d1aC7f92ab',
  'imtbl-zkevm-mainnet': '0x4f49B53928A71E553bB1B0F66a5BcB54Fd4E8932',
  'imtbl-zkevm-testnet': '0x6328Ac88ba8D466a0F551FC7C42C61d1aC7f92ab',
};

export const ADAPTER_IMPLEMENTATION_ADDRESS: ContractAddressRecord = {
  mainnet: '0xE2E91C1Ae2873720C3b975a8034e887A35323345',
  sepolia: '0xe9ec55e1fC90AB69B2Fb4C029d24a4622B94042e',
  'imtbl-zkevm-mainnet': '0x1d49c44dc4BbDE68D8D51a9C5732f3a24e48EFA6',
  'imtbl-zkevm-testnet': '0xac88a57943b5BBa1ecd931F8494cAd0B7F717590',
};

export const IMMUTABLE_SEAPORT_ADDRESS: ContractAddressRecord = {
  'imtbl-zkevm-mainnet': '0x6c12aD6F0bD274191075Eb2E78D7dA5ba6453424',
  'imtbl-zkevm-testnet': '0x7d117aA8BD6D31c4fa91722f246388f38ab1942c',
};

export const OPERATOR_ALLOWLIST_ADDRESS: ContractAddressRecord = {
  'imtbl-zkevm-mainnet': '0x5F5EBa8133f68ea22D712b0926e2803E78D89221',
  'imtbl-zkevm-testnet': '0x6b969FD89dE634d8DE3271EbE97734FEFfcd58eE',
};

export const MINTER_API_ADDRESS: ContractAddressRecord = {
  'imtbl-zkevm-mainnet': '0xbb7ee21AAaF65a1ba9B05dEe234c5603C498939E',
  'imtbl-zkevm-testnet': '0x9CcFbBaF5509B1a03826447EaFf9a0d1051Ad0CF',
};
