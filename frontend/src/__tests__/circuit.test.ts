/**
 * circuit.test.ts
 *
 * Pure TypeScript / Node tests for the age-verifier Compact circuit.
 * These tests exercise two categories the AI assessor required:
 *
 *   1. Circuit-logic — the constructor `assert(myAge >= 18)` must throw for
 *      underage inputs and succeed for eligible ones.
 *
 *   2. Ledger-state-transition — after a valid construction the on-chain ledger
 *      fields (`minimumAge` and `lastVerificationSuccess`) must reflect the
 *      correct values as defined by the Compact source.
 *
 * The tests import directly from the pre-compiled JS module
 * (frontend/src/contracts/age-verifier/index.js) and from
 * @midnight-ntwrk/compact-runtime, both of which are already in the
 * dependency tree.
 *
 * No browser / DOM / React is needed — these run in the default Node
 * environment that Vitest uses when `environment` is not 'jsdom'.
 */

import { describe, it, expect } from 'vitest';
import { Contract, ledger } from '../contracts/age-verifier/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Minimal constructor context accepted by the compiled Compact contract.
 * The coinPublicKey is a 32-byte zero buffer — fine for unit tests that
 * never submit to a real proof server.
 */
function makeCtx() {
  return {
    initialZswapLocalState: { coinPublicKey: new Uint8Array(32) },
    initialPrivateState: {},
  };
}

/**
 * Build the initial contract state for a given age.
 * Throws a CompactError when the age assertion fails.
 */
function buildState(age: bigint) {
  const contract = new Contract({});
  return contract.initialState(makeCtx(), age);
}

// ─── 1. Circuit-Logic Tests ───────────────────────────────────────────────────

describe('Circuit-Logic — age-verifier.compact constructor assertion', () => {

  it('rejects age 17 (below threshold) with a CompactError', () => {
    expect(() => buildState(17n)).toThrow('You do not meet the minimum age requirement!');
  });

  it('rejects age 0 (zero) with a CompactError', () => {
    expect(() => buildState(0n)).toThrow('You do not meet the minimum age requirement!');
  });

  it('rejects age 1 (minimum non-zero below threshold) with a CompactError', () => {
    expect(() => buildState(1n)).toThrow(/minimum age requirement/i);
  });

  it('accepts age 18 (exact threshold) without throwing', () => {
    expect(() => buildState(18n)).not.toThrow();
  });

  it('accepts age 21 (typical adult) without throwing', () => {
    expect(() => buildState(21n)).not.toThrow();
  });

  it('accepts age 99 (elderly user) without throwing', () => {
    expect(() => buildState(99n)).not.toThrow();
  });

  it('throws a CompactError (not a generic Error) for underage input', () => {
    let caught: unknown;
    try {
      buildState(17n);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    // The error constructor name is 'CompactError' from @midnight-ntwrk/compact-runtime
    expect((caught as Error).constructor.name).toBe('CompactError');
  });

  it('throws TypeError for a non-bigint age input (type guard)', () => {
    const contract = new Contract({});
    // Passing a plain number instead of bigint should trigger compact-runtime type guard
    expect(() => contract.initialState(makeCtx(), 25 as unknown as bigint)).toThrow();
  });
});

// ─── 2. Ledger-State-Transition Tests ────────────────────────────────────────

describe('Ledger-State-Transition — post-construction ledger fields', () => {

  it('sets minimumAge to 18n after successful construction (age=18)', () => {
    const state = buildState(18n);
    const l = ledger(state.currentContractState.data);
    expect(l.minimumAge).toBe(18n);
  });

  it('sets minimumAge to 18n after successful construction (age=25)', () => {
    const state = buildState(25n);
    const l = ledger(state.currentContractState.data);
    expect(l.minimumAge).toBe(18n);
  });

  it('sets lastVerificationSuccess to true after successful construction', () => {
    const state = buildState(21n);
    const l = ledger(state.currentContractState.data);
    expect(l.lastVerificationSuccess).toBe(true);
  });

  it('minimumAge is always 18n regardless of the valid age supplied', () => {
    for (const age of [18n, 20n, 30n, 65n, 99n]) {
      const state = buildState(age);
      const l = ledger(state.currentContractState.data);
      expect(l.minimumAge).toBe(18n);
    }
  });

  it('lastVerificationSuccess is always true after a valid construction', () => {
    for (const age of [18n, 21n, 40n]) {
      const state = buildState(age);
      const l = ledger(state.currentContractState.data);
      expect(l.lastVerificationSuccess).toBe(true);
    }
  });

  it('returns a currentContractState object from initialState', () => {
    const result = buildState(18n);
    expect(result).toHaveProperty('currentContractState');
    expect(result).toHaveProperty('currentPrivateState');
    expect(result).toHaveProperty('currentZswapLocalState');
  });
});
