import { describe, expect, it } from 'bun:test'
import { parseBalanceMap } from '../src/scripts/merkle-distributor/helpers/parse-balance-map'

describe('parseBalanceMap', () => {
  it('builds a merkle tree from an address->balance map (old format)', () => {
    const input = {
      '0x0000000000000000000000000000000000000001': '100',
      '0x0000000000000000000000000000000000000002': '200',
    }
    const result = parseBalanceMap(input)
    expect(result.merkleRoot).toMatch(/^0x[0-9a-f]+$/)
    expect(Object.keys(result.claims)).toHaveLength(2)
    expect(BigInt(result.tokenTotal)).toBe(300n * 10n**18n)
  })

  it('accepts the new format (address/earnings/reasons array)', () => {
    const input = [
      { address: '0x0000000000000000000000000000000000000001', earnings: 100n, reasons: 'a' },
      { address: '0x0000000000000000000000000000000000000002', earnings: 50n, reasons: 'b' },
    ]
    const result = parseBalanceMap(input)
    expect(BigInt(result.tokenTotal)).toBe(150n)
    expect(Object.keys(result.claims)).toHaveLength(2)
    // every claim carries an index + proof
    for (const claim of Object.values(result.claims)) {
      expect(typeof claim.index).toBe('number')
      expect(Array.isArray(claim.proof)).toBe(true)
    }
  })

  it('is deterministic for the same input', () => {
    const input = { '0x0000000000000000000000000000000000000001': '42' }
    expect(parseBalanceMap(input).merkleRoot).toBe(parseBalanceMap(input).merkleRoot)
  })
})
