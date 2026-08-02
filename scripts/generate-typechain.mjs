import { spawnSync } from 'node:child_process'

const result = spawnSync(
  process.platform === 'win32' ? 'typechain.cmd' : 'typechain',
  [
    '--target',
    'ethers-v6',
    '--out-dir',
    'src/types/typechain',
    '--input-dir',
    'artifacts',
    'artifacts/src/contracts/**/*.json',
  ],
  { stdio: 'inherit' }
)

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
