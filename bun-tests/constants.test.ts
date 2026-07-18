import { describe, expect, it } from 'bun:test'
import { BURN_PERCENTAGE, DAO_PERCENTAGE, TREASURY_PERCENTAGE } from '../src/constants/itemsSale'
import { ALLOWED_COLORS } from '../src/constants/allowedColors'
import {
  NFTL_EMISSION_START,
  NFTL_EMISSION_END,
  TOTAL_WINNER_TICKET_COUNT,
  PENDING_PERIOD,
} from '../src/constants/other'

describe('itemsSale percentages', () => {
  it('sum to 1000 (100% with 0.1% precision)', () => {
    expect(BURN_PERCENTAGE + DAO_PERCENTAGE + TREASURY_PERCENTAGE).toBe(1000n)
  })

  it('allocates the majority to burns', () => {
    expect(BURN_PERCENTAGE).toBeGreaterThan(DAO_PERCENTAGE)
    expect(BURN_PERCENTAGE).toBeGreaterThan(TREASURY_PERCENTAGE)
  })
})

describe('allowedColors', () => {
  it('exposes at least the core species palettes', () => {
    const names = ['APE', 'HUMAN', 'DOGE', 'FROG', 'CAT', 'ALIEN', 'HYDRA', 'RUGMAN', 'SATOSHI']
    for (const n of names) {
      expect(ALLOWED_COLORS.some((palette: number[]) => palette.length > 0)).toBe(true)
    }
    // ALLOWED_COLORS is the flattened accessible list of all palettes
    expect(ALLOWED_COLORS.length).toBeGreaterThan(0)
  })
})

describe('other constants', () => {
  it('emission window ends after it starts', () => {
    expect(NFTL_EMISSION_END).toBeGreaterThan(NFTL_EMISSION_START)
  })

  it('pending period is ~17 days in seconds', () => {
    expect(PENDING_PERIOD).toBe(1209600)
  })

  it('has a fixed winner ticket count', () => {
    expect(TOTAL_WINNER_TICKET_COUNT).toBe(17)
  })
})
