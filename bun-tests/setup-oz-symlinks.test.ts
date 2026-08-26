import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { setupOpenZeppelinAliases } from '../scripts/setup-oz-symlinks.mjs'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('setupOpenZeppelinAliases', () => {
  test('dereferences Bun global-store links when copying aliases', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-oz-'))
    temporaryDirectories.push(root)

    const nodeModules = join(root, 'node_modules')
    const storeTarget = join(root, 'store', 'contracts-v4')
    mkdirSync(storeTarget, { recursive: true })
    mkdirSync(join(nodeModules, '@openzeppelin'), { recursive: true })
    writeFileSync(join(storeTarget, 'marker.txt'), 'v4')
    symlinkSync(storeTarget, join(nodeModules, '@openzeppelin', 'contracts-v4'))

    setupOpenZeppelinAliases(root, [['openzeppelin-contracts-4', '@openzeppelin/contracts-v4']])

    expect(readFileSync(join(nodeModules, 'openzeppelin-contracts-4', 'marker.txt'), 'utf8')).toBe(
      'v4'
    )
  })
})
