// @imtbl/contracts v3 imports openzeppelin-contracts-4 and openzeppelin-contracts-5
// as separate hardhat library packages. We install @openzeppelin/contracts (v4)
// and @openzeppelin/contracts-v5 (v5) and copy them into the alias directories
// so hardhat sees distinct source paths (symlinks resolve to the same file and
// hardhat rejects that with HH415).
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nm = resolve(root, 'node_modules');

const aliases = [
  ['openzeppelin-contracts-4', '@openzeppelin/contracts'],
  ['openzeppelin-contracts-5', '@openzeppelin/contracts-v5'],
];

for (const [alias, target] of aliases) {
  const aliasPath = resolve(nm, alias);
  const targetPath = resolve(nm, target);
  if (!existsSync(targetPath)) {
    console.warn(`[setup-oz] target ${target} not found, skipping ${alias}`);
    continue;
  }
  try {
    rmSync(aliasPath, { recursive: true, force: true });
    mkdirSync(aliasPath, { recursive: true });
    cpSync(targetPath, aliasPath, { recursive: true });
    console.log(`[setup-oz] copied ${target} -> ${alias}`);
  } catch (e) {
    console.warn(`[setup-oz] failed for ${alias}: ${e.message}`);
  }
}
