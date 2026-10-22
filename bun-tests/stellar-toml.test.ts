import { describe, expect, it } from 'bun:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const axelarRequire = createRequire(require.resolve('@axelar-network/axelarjs-sdk'))
const stellarRequire = createRequire(axelarRequire.resolve('@stellar/stellar-sdk'))
const toml = stellarRequire('toml')

describe('Stellar TOML dependency', () => {
  it('preserves the configuration shapes used by Stellar', () => {
    expect(
      toml.parse(`VERSION = "2.0.0"
NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015"
[[CURRENCIES]]
code = "USD"
issuer = "GABC"
display_decimals = 7
is_asset_anchored = true
`)
    ).toEqual({
      VERSION: '2.0.0',
      NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
      CURRENCIES: [{ code: 'USD', issuer: 'GABC', display_decimals: 7, is_asset_anchored: true }],
    })
  })

  it('retains parser errors and compiler error locations', () => {
    expect(() => toml.parse('x = [')).toThrow(SyntaxError)
    expect(() => toml.parse('x = 1\nx = 2')).toThrow("Cannot redefine existing key 'x'")
  })

  it('parses many distinct array tables without quadratic compiler work', () => {
    const input = Array.from({ length: 20_000 }, (_, index) => `[[table${index}]]`).join('\n')
    expect(Object.keys(toml.parse(input))).toHaveLength(20_000)
  }, 3_000)

  it('rejects unbounded integer literals instead of converting them to BigInt', () => {
    expect(() => toml.parse(`value = ${'9'.repeat(100_000)}`)).toThrow()
  }, 3_000)
})
