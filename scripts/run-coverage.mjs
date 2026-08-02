import { cp, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = path.join(root, 'src', 'contracts')
const coverageSource = path.join(root, '.coverage-contracts')

await rm(coverageSource, { force: true, recursive: true })
await cp(source, coverageSource, {
  recursive: true,
  filter: (entry) => !entry.endsWith(path.join('external', 'WETH.sol')),
})

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(
    'bunx',
    [
      'hardhat',
      'test',
      '--network',
      'hardhat',
      '--coverage',
      '--config',
      'hardhat.coverage.config.ts',
    ],
    { cwd: root, env: process.env, stdio: 'inherit' }
  )

  child.once('error', reject)
  child.once('exit', (code, signal) => {
    resolve(code ?? (signal === null ? 1 : 1))
  })
})

await rm(coverageSource, { force: true, recursive: true })
process.exitCode = exitCode
