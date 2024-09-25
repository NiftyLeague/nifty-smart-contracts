// https://docs.axelar.dev/dev/send-tokens/interchain-tokens/developer-guides/link-custom-tokens-deployed-across-multiple-chains-into-interchain-tokens/

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { Address } from 'hardhat-deploy/types';

import crypto from 'crypto';
import { AxelarQueryAPI, Environment, EvmChain, GasToken } from '@axelar-network/axelarjs-sdk';
import { INTERCHAIN_TOKEN_SERVICE_ADDRESS, INTERCHAIN_TOKEN_RECORD } from '~/constants/addresses';
import INTERCHAIN_TOKEN_SERVICE_ABI from '~/constants/abi/@axelar-network/interchain-token-service/contracts/interchainTokenServiceABI.json';
import { InterchainTokenData, NetworkName } from '~/types';
import { NFTLToken } from '~/types/typechain';

// https://docs.axelar.dev/dev/send-tokens/interchain-tokens/token-manager/#token-manager-types
enum TokenManagerType {
  NativeInterchainToken = 0,
  MintBurnFrom = 1,
  LockUnlock = 2,
  LockUnlockFee = 3,
  MintBurn = 4,
  Gateway = 5,
}

// Estimate the actual cost of deploying a Canonical Interchain Token on the remote chain:
const gasEstimator = async (network: NetworkName) => {
  if (network === NetworkName.IMXzkEVMTestnet || network) {
    const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
    return await api.estimateGasFee(EvmChain.SEPOLIA, EvmChain.IMMUTABLE, 700_000, 1.1, GasToken.SEPOLIA);
  } else {
    const api = new AxelarQueryAPI({ environment: Environment.MAINNET });
    return await api.estimateGasFee(EvmChain.ETHEREUM, EvmChain.IMMUTABLE, 700_000, 1.1, GasToken.ETH);
  }
};

export const getInterchainTokenRecord = async (network: NetworkName) => {
  const interchainToken = INTERCHAIN_TOKEN_RECORD[network];
  if (!interchainToken) throw new Error(`Interchain token record not found for network: ${network}`);
  return interchainToken;
};

const getInterchainTokenServiceContract = async (hre: HardhatRuntimeEnvironment, deployer: Address) => {
  const signer = await hre.ethers.getSigner(deployer);
  return new hre.ethers.Contract(INTERCHAIN_TOKEN_SERVICE_ADDRESS, INTERCHAIN_TOKEN_SERVICE_ABI, signer);
};

export const transferTokens = async (hre: HardhatRuntimeEnvironment, remoteNetwork: NetworkName, amount: bigint) => {
  const { deployer } = await hre.getNamedAccounts();
  const interchainTokenService = await getInterchainTokenServiceContract(hre, deployer);
  const { interchainTokenId } = await getInterchainTokenRecord(remoteNetwork);
  const gasAmount = await gasEstimator(remoteNetwork);

  const destinationChain =
    remoteNetwork === NetworkName.Sepolia
      ? EvmChain.SEPOLIA
      : remoteNetwork === NetworkName.Mainnet
        ? EvmChain.ETHEREUM
        : EvmChain.IMMUTABLE;

  console.log(
    `\nSending ${hre.ethers.formatEther(amount)} NFTL to ${destinationChain}... interchainTokenId: ${interchainTokenId}`,
  );

  if (destinationChain === EvmChain.IMMUTABLE) {
    const NFTL = await hre.ethers.getContract<NFTLToken>('NFTLToken');
    const allowance = await NFTL.allowance(deployer, INTERCHAIN_TOKEN_SERVICE_ADDRESS);
    if (allowance < amount) {
      const tx = await NFTL.approve(INTERCHAIN_TOKEN_SERVICE_ADDRESS, amount);
      console.log('✅ InterchainTokenManager approved to spend NFTL');
      tx.wait(5);
    }
  }

  const transfer = await interchainTokenService.interchainTransfer(
    interchainTokenId, // interchainTokenId
    destinationChain, // destination chain
    deployer, // receiver address
    amount, // amount of token to transfer
    '0x', // metadata
    hre.ethers.parseEther('0.0001'), // gasValue
    { value: gasAmount },
  );

  console.log('✅ Transfer Transaction Hash:', transfer.hash);
};

// Root Chain: Ethereum (L1) ------------------------------------------------------------------------- //
export const deployRootTokenManager = async (
  hre: HardhatRuntimeEnvironment,
  tokenAddress: Address,
): Promise<InterchainTokenData> => {
  const network = hre.network.name as NetworkName;
  const record = await getInterchainTokenRecord(network);
  if (record.tokenManagerAddress) {
    console.log(`reusing "RootInterchainTokenManager" at ${record.tokenManagerAddress}`);
    return record;
  }

  console.log('\nDeploying RootInterchainTokenManager...');

  const { deployer } = await hre.getNamedAccounts();
  const interchainTokenService = await getInterchainTokenServiceContract(hre, deployer);

  const salt = record.salt?.length ? record.salt : '0x' + crypto.randomBytes(32).toString('hex');
  const params = hre.ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'address'], [deployer, tokenAddress]);

  const deployTxData = await interchainTokenService.deployTokenManager(
    salt, // salt
    '', // destinationChain
    TokenManagerType.LockUnlock, // tokenManagerType
    params, // params
    hre.ethers.parseEther('0.01'), // gasFeeAmount
  );

  const transactionHash = deployTxData.hash;
  const interchainTokenId = await interchainTokenService.interchainTokenId(deployer, salt);
  const tokenManagerAddress = await interchainTokenService.tokenManagerAddress(interchainTokenId);

  console.log(
    `
        Salt: ${salt},
        Transaction Hash: ${transactionHash},
        Token ID: ${interchainTokenId},
        Expected Token Manager Address: ${tokenManagerAddress},
    `,
  );
  console.log('✅ Complete');

  return { salt, transactionHash, interchainTokenId, tokenManagerAddress };
};

// Child Chain: Immutable zkEVM (L2) ----------------------------------------------------------------- //
export const deployRemoteTokenManager = async (
  hre: HardhatRuntimeEnvironment,
  remoteNetwork: NetworkName,
  tokenAddress: Address,
  salt: string,
): Promise<InterchainTokenData> => {
  const record = await getInterchainTokenRecord(remoteNetwork);
  if (record.tokenManagerAddress) {
    console.log(`reusing "RemoteInterchainTokenManager" at ${record.tokenManagerAddress}`);
    return record;
  }

  console.log('\nDeploying RemoteInterchainTokenManager...');

  const { deployer } = await hre.getNamedAccounts();
  const interchainTokenService = await getInterchainTokenServiceContract(hre, deployer);

  const params = hre.ethers.AbiCoder.defaultAbiCoder().encode(['bytes', 'address'], [deployer, tokenAddress]);
  const gasAmount = await gasEstimator(remoteNetwork);
  console.log('GAS ESTIMATE: ', gasAmount);

  const deployTxData = await interchainTokenService.deployTokenManager(
    salt, // salt
    EvmChain.IMMUTABLE, // destinationChain
    TokenManagerType.MintBurn, // tokenManagerType
    params, // params
    hre.ethers.parseEther('0.01'), // gasFeeAmount to pay. Excess will be refunded
    { value: gasAmount },
  );

  const transactionHash = deployTxData.hash;
  const interchainTokenId = await interchainTokenService.interchainTokenId(deployer, salt);
  const tokenManagerAddress = await interchainTokenService.tokenManagerAddress(interchainTokenId);

  console.log(
    `
        Salt: ${salt},
        Transaction Hash: ${transactionHash},
        Token ID: ${interchainTokenId},
        Expected Token Manager Address: ${tokenManagerAddress},
    `,
  );
  console.log('✅ Complete');

  return { salt, transactionHash, interchainTokenId, tokenManagerAddress };
};
