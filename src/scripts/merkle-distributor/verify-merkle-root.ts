import { keccak256, solidityPacked } from 'ethers';
import { program } from 'commander';
import fs from 'fs';

program
  .version('0.0.0')
  .requiredOption(
    '-i, --input <path>',
    'input JSON file location containing the merkle proofs for each account and the merkle root',
  );

program.parse(process.argv);

const options = program.opts();
const json = JSON.parse(fs.readFileSync(options.input, { encoding: 'utf8' }));

const combinedHash = (first: Buffer, second: Buffer): Buffer => {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }

  return Buffer.from(
    keccak256(solidityPacked(['bytes32', 'bytes32'], [first, second].sort(Buffer.compare))).slice(2),
    'hex',
  );
};

const toNode = (index: number | bigint, account: string, amount: bigint): Buffer => {
  const pairHex = keccak256(solidityPacked(['uint256', 'address', 'uint256'], [index, account, amount]));
  return Buffer.from(pairHex.slice(2), 'hex');
};

const verifyProof = (
  index: number | bigint,
  account: string,
  amount: bigint,
  proof: Buffer[],
  root: Buffer,
): boolean => {
  let pair = toNode(index, account, amount);
  for (const item of proof) {
    pair = combinedHash(pair, item);
  }

  return pair.equals(root);
};

const getNextLayer = (elements: Buffer[]): Buffer[] => {
  return elements.reduce<Buffer[]>((layer, el, idx, arr) => {
    if (idx % 2 === 0) {
      // Hash the current element with its pair element
      layer.push(combinedHash(el, arr[idx + 1]));
    }

    return layer;
  }, []);
};

const getRoot = (balances: { account: string; amount: bigint; index: number }[]): Buffer => {
  let nodes = balances
    .map(({ account, amount, index }) => toNode(index, account, amount))
    // sort by lexicographical order
    .sort(Buffer.compare);

  // Deduplicate any elements
  nodes = nodes.filter((el, idx) => {
    return idx === 0 || !nodes[idx - 1].equals(el);
  });

  const layers = [];
  layers.push(nodes);

  // Get next layer until we reach the root
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1]));
  }

  return layers[layers.length - 1][0];
};

if (typeof json !== 'object') throw new Error('Invalid JSON');

const merkleRootHex = json.merkleRoot;
const merkleRoot = Buffer.from(merkleRootHex.slice(2), 'hex');

let balances: { index: number; account: string; amount: bigint }[] = [];
let valid = true;

Object.keys(json.claims).forEach(address => {
  const claim = json.claims[address];
  const proof = claim.proof.map((p: string) => Buffer.from(p.slice(2), 'hex'));
  balances.push({ index: claim.index, account: address, amount: BigInt(claim.amount) });
  if (verifyProof(claim.index, address, BigInt(claim.amount), proof, merkleRoot)) {
    console.log('Verified proof for', claim.index, address);
  } else {
    console.log('Verification for', address, 'failed');
    valid = false;
  }
});

if (!valid) {
  console.error('Failed validation for 1 or more proofs');
  process.exit(1);
}
console.log('Done!');

// Root
const root = getRoot(balances).toString('hex');
console.log('Reconstructed merkle root', root);
console.log('Root matches the one read from the JSON?', root === merkleRootHex.slice(2));
