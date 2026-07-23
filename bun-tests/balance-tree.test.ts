import { describe, expect, it } from 'bun:test';
import BalanceTree from '../src/scripts/merkle-distributor/helpers/balance-tree';

function proofToBuffers(proof: string[]): Buffer[] {
  return proof.map((p) => Buffer.from(p.slice(2), 'hex'));
}

describe('BalanceTree', () => {
  const balances = [
    { account: '0x0000000000000000000000000000000000000001', amount: 100n },
    { account: '0x0000000000000000000000000000000000000002', amount: 200n },
    { account: '0x0000000000000000000000000000000000000003', amount: 300n },
  ];

  it('computes a deterministic merkle root for a simple list', () => {
    const tree = new BalanceTree(balances);
    expect(typeof tree.getHexRoot()).toBe('string');
    expect(tree.getHexRoot()).toMatch(/^0x[0-9a-f]+$/);
  });

  it('returns a valid proof for each leaf that verifies against the root', () => {
    const tree = new BalanceTree(balances);
    const root = Buffer.from(tree.getHexRoot().slice(2), 'hex');

    for (const [index, { account, amount }] of balances.entries()) {
      const proof = proofToBuffers(tree.getProof(index, account, amount));
      expect(Array.isArray(proof)).toBe(true);
      expect(proof.length).toBeGreaterThan(0);

      const verified = BalanceTree.verifyProof(index, account, amount, proof, root);
      expect(verified).toBe(true);
    }
  });

  it('rejects a tampered proof element', () => {
    const tree = new BalanceTree(balances);
    const root = Buffer.from(tree.getHexRoot().slice(2), 'hex');

    const { account, amount } = balances[0];
    let proof = proofToBuffers(tree.getProof(0, account, amount));
    // Flip a bit in the first proof element
    proof = proof.map((p, i) => (i === 0 ? Buffer.concat([p.subarray(0, -4), Buffer.from('abcd', 'hex')]) : p));

    expect(BalanceTree.verifyProof(0, account, amount, proof, root)).toBe(false);
  });

  it('rejects a mismatched amount in the leaf', () => {
    const tree = new BalanceTree(balances);
    const root = Buffer.from(tree.getHexRoot().slice(2), 'hex');

    const { account, amount } = balances[0];
    const proof = proofToBuffers(tree.getProof(0, account, amount));
    expect(BalanceTree.verifyProof(0, account, amount + 1n, proof, root)).toBe(false);
  });

  it('rejects a proof that does not include the claimed leaf element', () => {
    const tree = new BalanceTree(balances);
    const root = Buffer.from(tree.getHexRoot().slice(2), 'hex');

    const otherBalances = [
      { account: '0x1111111111111111111111111111111111111111', amount: 999n },
      { account: '0x2222222222222222222222222222222222222222', amount: 888n },
    ];
    const otherTree = new BalanceTree(otherBalances);
    const wrongProof = proofToBuffers(otherTree.getProof(0, otherBalances[0].account, otherBalances[0].amount));

    expect(
      BalanceTree.verifyProof(0, balances[0].account, balances[0].amount, wrongProof, root),
    ).toBe(false);
  });

  it('verifies with bigint index input', () => {
    const tree = new BalanceTree(balances);
    const root = Buffer.from(tree.getHexRoot().slice(2), 'hex');
    const proof = proofToBuffers(tree.getProof(0, balances[0].account, balances[0].amount));
    expect(BalanceTree.verifyProof(0n, balances[0].account, balances[0].amount, proof, root)).toBe(true);
  });
});
