import { describe, expect, it } from 'bun:test';
import { BURN_LIST } from '../src/constants/burnList';

describe('BURN_LIST', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BURN_LIST)).toBe(true);
    expect(BURN_LIST.length).toBeGreaterThan(0);
  });

  it('contains only positive integers', () => {
    for (const id of BURN_LIST) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    }
  });

  it('contains no duplicate token IDs', () => {
    const unique = new Set(BURN_LIST);
    expect(unique.size).toBe(BURN_LIST.length);
  });

  it('is sorted in ascending order', () => {
    for (let i = 1; i < BURN_LIST.length; i++) {
      expect(BURN_LIST[i]).toBeGreaterThanOrEqual(BURN_LIST[i - 1]);
    }
  });

  it('has the expected length', () => {
    expect(BURN_LIST.length).toBe(800);
  });

  it('includes known burn token IDs', () => {
    expect(BURN_LIST).toContain(11);
    expect(BURN_LIST).toContain(98);
    expect(BURN_LIST).toContain(100);
    expect(BURN_LIST).toContain(9871);
  });

  it('excludes non-burn token IDs', () => {
    expect(BURN_LIST).not.toContain(0);
    expect(BURN_LIST).not.toContain(1);
    expect(BURN_LIST).not.toContain(2);
    expect(BURN_LIST).not.toContain(10);
    expect(BURN_LIST).not.toContain(1000);
    expect(BURN_LIST).not.toContain(5000);
    expect(BURN_LIST).not.toContain(10000);
  });
});
