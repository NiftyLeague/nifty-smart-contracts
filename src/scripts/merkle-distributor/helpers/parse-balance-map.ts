import { getAddress, isAddress, parseEther } from 'ethers';
import BalanceTree from './balance-tree';

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
interface MerkleDistributorInfo {
  merkleRoot: string;
  tokenTotal: string;
  claims: {
    [account: string]: {
      index: number;
      amount: string;
      proof: string[];
      flags?: {
        [flag: string]: boolean;
      };
    };
  };
}

type OldFormat = { [account: string]: string };
type NewFormat = { address: string; earnings: bigint; reasons: string };

export function parseBalanceMap(balances: OldFormat | NewFormat[]): MerkleDistributorInfo {
  const balancesInNewFormat: NewFormat[] = Array.isArray(balances)
    ? balances
    : Object.keys(balances).map(
        (account): NewFormat => ({
          address: account,
          // Convert string number to 18 decimals ether formatted string
          earnings: parseEther(balances[account]),
          reasons: '',
        }),
      );

  const dataByAddress = balancesInNewFormat.reduce<{
    [address: string]: { amount: bigint; flags?: { [flag: string]: boolean } };
  }>((memo, { address: account, earnings, reasons }) => {
    if (earnings <= 0n) throw new Error(`Invalid amount for account: ${account}`);
    if (!isAddress(account)) throw new Error(`Found invalid address: ${account}`);

    const parsed = getAddress(account);
    if (memo[parsed]) throw new Error(`Duplicate address: ${parsed}`);

    const flags = {
      isAirdrop: reasons.includes('airdrop'),
      isBalanceManager: reasons.includes('balance-manager'),
      isPlayer: reasons.includes('player'),
    };

    memo[parsed] = { amount: earnings, ...(reasons === '' ? {} : { flags }) };
    return memo;
  }, {});

  const sortedAddresses = Object.keys(dataByAddress).sort();

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map(address => ({ account: address, amount: dataByAddress[address].amount })),
  );

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: { amount: string; index: number; proof: string[]; flags?: { [flag: string]: boolean } };
  }>((memo, address, index) => {
    const { amount, flags } = dataByAddress[address];
    memo[address] = {
      index,
      amount: `0x${amount.toString(16)}`, // Convert to hex string for output
      proof: tree.getProof(index, address, amount),
      ...(flags ? { flags } : {}),
    };
    return memo;
  }, {});

  // Calculate total token balance using bigint
  const tokenTotal = sortedAddresses.reduce<bigint>((memo, key) => memo + dataByAddress[key].amount, 0n);

  return {
    merkleRoot: tree.getHexRoot(),
    tokenTotal: `0x${tokenTotal.toString(16)}`, // Convert total to hex string
    claims,
  };
}
