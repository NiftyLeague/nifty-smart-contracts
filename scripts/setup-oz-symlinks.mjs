// @imtbl/contracts v3 imports openzeppelin-contracts-4 and openzeppelin-contracts-5
// as separate hardhat library packages. We install @openzeppelin/contracts (v5)
// as the default and keep v4 available via the explicit @openzeppelin/contracts-v4
// alias. We copy them into the alias directories so hardhat sees distinct source
// paths (symlinks resolve to the same file and hardhat rejects that with HH415).
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aliases = [
  ['openzeppelin-contracts-4', '@openzeppelin/contracts-v4'],
  ['openzeppelin-contracts-5', '@openzeppelin/contracts'],
]

export function setupOpenZeppelinAliases(root, aliasesToCopy = aliases) {
  const nm = resolve(root, 'node_modules')

  for (const [alias, target] of aliasesToCopy) {
    const aliasPath = resolve(nm, alias)
    const targetPath = resolve(nm, target)
    if (!existsSync(targetPath)) {
      console.warn(`[setup-oz] target ${target} not found, skipping ${alias}`)
      continue
    }
    try {
      rmSync(aliasPath, { recursive: true, force: true })
      cpSync(targetPath, aliasPath, { recursive: true, dereference: true })
      console.log(`[setup-oz] copied ${target} -> ${alias}`)
    } catch (e) {
      console.warn(`[setup-oz] failed for ${alias}: ${e.message}`)
    }
  }
}

const scriptPath = fileURLToPath(import.meta.url)
if (process.argv[1] && scriptPath === resolve(process.argv[1])) {
  setupOpenZeppelinAliases(resolve(dirname(scriptPath), '..'))
}
