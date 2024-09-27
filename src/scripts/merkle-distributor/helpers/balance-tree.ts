import { keccak256, solidityPacked } from 'ethers';
import MerkleTree from './merkle-tree';

export default class BalanceTree {
  private readonly tree: MerkleTree;

  constructor(balances: { account: string; amount: bigint }[]) {
    this.tree = new MerkleTree(
      balances.map(({ account, amount }, index) => {
        return BalanceTree.toNode(index, account, amount);
      }),
    );
  }

  public static verifyProof(
    index: number | bigint,
    account: string,
    amount: bigint,
    proof: Buffer[],
    root: Buffer,
  ): boolean {
    let pair = BalanceTree.toNode(index, account, amount);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  // keccak256(abi.encode(index, account, amount))
  public static toNode(index: number | bigint, account: string, amount: bigint): Buffer {
    return Buffer.from(
      keccak256(solidityPacked(['uint256', 'address', 'uint256'], [index, account, amount])).slice(2), // Remove '0x' from the hex string
      'hex',
    );
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  public getProof(index: number | bigint, account: string, amount: bigint): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(index, account, amount));
  }
}