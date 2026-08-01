import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'
import { exportDeployments } from '../scripts/export-deployments.mjs'

describe('exportDeployments', () => {
  test('preserves the hardhat-deploy single-network export shape', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'nifty-deployments-'))
    const deploymentsDirectory = path.join(root, 'sepolia')
    const outputFile = path.join(root, 'exports', 'deployments.sepolia.ts')

    try {
      await mkdir(deploymentsDirectory, { recursive: true })
      await writeFile(path.join(deploymentsDirectory, '.chainId'), '11155111\n')
      await writeFile(
        path.join(deploymentsDirectory, 'Token.json'),
        JSON.stringify({
          address: '0x123',
          abi: [{ type: 'function', name: 'totalSupply' }],
          bytecode: '0xignored',
          linkedData: { source: 'test' },
        })
      )

      await exportDeployments({
        deploymentsDirectory,
        outputFile,
        networkName: 'sepolia',
      })

      const rendered = await readFile(outputFile, 'utf8')
      expect(rendered).toContain('export default')
      expect(rendered).toContain('"name": "sepolia"')
      expect(rendered).toContain('"chainId": "11155111"')
      expect(rendered).toContain('"address": "0x123"')
      expect(rendered).toContain('"source": "test"')
      expect(rendered).not.toContain('0xignored')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
