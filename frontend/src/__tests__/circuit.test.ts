/**
 * circuit.test.ts
 *
 * Pure TypeScript / Node tests for the age-verifier Compact circuit.
 *
 * New contract design (age-verifier.compact):
 *   - constructor(threshold): stores minimumAge = threshold; lastVerificationSuccess = false
 *   - verify(myAge):          assert(myAge >= minimumAge); lastVerificationSuccess = true
 *
 * This means:
 *   1. Deployment never checks the caller's age — it just records the threshold.
 *   2. Every verify() call must supply a private age that is checked on-the-fly
 *      against the stored threshold. Calling verify() with no age is a type error.
 *   3. lastVerificationSuccess starts as FALSE and is only set to TRUE by a
 *      successful verify() call — not by deployment.
 *
 * Tests cover:
 *   - Constructor-Logic: threshold stored correctly, no age check at deploy time.
 *   - Circuit-Logic: verify() enforces the threshold per call.
 *   - Ledger-State-Transition: correct state before and after verify().
 */

import { describe, it, expect } from 'vitest';
import { Contract, ledger } from '../contracts/age-verifier/index.js';
import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(): any {
  return {
    initialZswapLocalState: {
      coinPublicKey: new Uint8Array(32),
      currentIndex: 0n,
      inputs: [],
      outputs: [],
    },
    initialPrivateState: {},
  };
}

/** Deploy a fresh contract with the given threshold. Throws on bad types only. */
function deploy(threshold: bigint) {
  const contract = new Contract({});
  return contract.initialState(makeCtx(), threshold);
}

/**
 * Build a mock CircuitContext from an existing ContractState, sufficient for
 * calling the verify circuit in tests.
 */
function makeCircuitCtx(contractState: __compactRuntime.ContractState): any {
  return {
    currentQueryContext: new __compactRuntime.QueryContext(
      contractState.data,
      __compactRuntime.dummyContractAddress()
    ),
    currentPrivateState: {},
    currentZswapLocalState: {
      coinPublicKey: new Uint8Array(32),
      currentIndex: 0n,
      inputs: [],
      outputs: [],
    },
    costModel: __compactRuntime.CostModel.initialCostModel(),
  };
}

// ─── Category 1: Constructor-Logic ────────────────────────────────────────────

describe('Constructor-Logic — threshold is stored, no age check at deploy', () => {

  it('deploys successfully with threshold 18 without checking any caller age', () => {
    // Previously the constructor asserted myAge >= 18; now it just stores threshold.
    // No age is passed at deploy time — this must not throw.
    expect(() => deploy(18n)).not.toThrow();
  });

  it('deploys successfully with threshold 21 (higher age gate)', () => {
    expect(() => deploy(21n)).not.toThrow();
  });

  it('deploys successfully with threshold 0 (no age restriction)', () => {
    // A contract owner can set a threshold of 0 to allow anyone through.
    expect(() => deploy(0n)).not.toThrow();
  });

  it('stores the exact threshold value as minimumAge in the ledger', () => {
    const state = deploy(18n);
    const l = ledger(state.currentContractState.data);
    expect(l.minimumAge).toBe(18n);
  });

  it('stores a custom threshold (21) as minimumAge', () => {
    const state = deploy(21n);
    const l = ledger(state.currentContractState.data);
    expect(l.minimumAge).toBe(21n);
  });

  it('initialises lastVerificationSuccess to FALSE (no one has verified yet)', () => {
    // Key difference from old design: success starts false, not true.
    const state = deploy(18n);
    const l = ledger(state.currentContractState.data);
    expect(l.lastVerificationSuccess).toBe(false);
  });

  it('throws a TypeError for a non-bigint threshold (type guard)', () => {
    const contract = new Contract({});
    expect(() => contract.initialState(makeCtx(), 18 as unknown as bigint)).toThrow();
  });

  it('returns a valid ConstructorResult with currentContractState', () => {
    const result = deploy(18n);
    expect(result).toHaveProperty('currentContractState');
    expect(result).toHaveProperty('currentPrivateState');
    expect(result).toHaveProperty('currentZswapLocalState');
  });
});

// ─── Category 2: Circuit-Logic — verify() enforces threshold per call ─────────

describe('Circuit-Logic — verify(myAge) asserts age >= minimumAge on every call', () => {

  it('verify() with age below threshold throws CompactError', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 17n))
      .toThrow('You do not meet the minimum age requirement!');
  });

  it('verify() with age = 0 throws CompactError', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 0n))
      .toThrow('You do not meet the minimum age requirement!');
  });

  it('verify() with age exactly at threshold (18) does NOT throw', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 18n)).not.toThrow();
  });

  it('verify() with age above threshold (25) does NOT throw', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 25n)).not.toThrow();
  });

  it('verify() with a custom threshold of 21: age 20 throws', () => {
    const deployed = deploy(21n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 20n))
      .toThrow('You do not meet the minimum age requirement!');
  });

  it('verify() with a custom threshold of 21: age 21 succeeds', () => {
    const deployed = deploy(21n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 21n)).not.toThrow();
  });

  it('verify() throws CompactError (not a plain Error) for underage input', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    let caught: unknown;
    try {
      contract.circuits.verify(ctx, 16n);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect((caught as Error).constructor.name).toBe('CompactError');
    expect((caught as Error).message).toMatch(/minimum age requirement/i);
  });

  it('verify() throws TypeError for a non-bigint age (type guard)', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    expect(() => contract.circuits.verify(ctx, 25 as unknown as bigint)).toThrow();
  });
});

// ─── Category 3: Ledger-State-Transition after verify() ──────────────────────

describe('Ledger-State-Transition — state changes after verify()', () => {

  it('lastVerificationSuccess is false BEFORE any verify() call', () => {
    const deployed = deploy(18n);
    const l = ledger(deployed.currentContractState.data);
    expect(l.lastVerificationSuccess).toBe(false);
  });

  it('minimumAge remains the same threshold value after verify() succeeds', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    // circuits.verify returns { result, context, proofData, gasCost };
    // the mutated ledger state lives on result.context, not the original ctx.
    const result = contract.circuits.verify(ctx, 21n);
    const l = ledger(result.context.currentQueryContext.state);
    expect(l.minimumAge).toBe(18n);
  });

  it('lastVerificationSuccess is true AFTER a successful verify() call', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    // State mutations are on result.context — the wrapper shallow-copies ctx,
    // so internal state replacements aren't reflected back on the original ctx.
    const result = contract.circuits.verify(ctx, 21n);
    const l = ledger(result.context.currentQueryContext.state);
    expect(l.lastVerificationSuccess).toBe(true);
  });

  it('ledger state is NOT mutated when verify() fails (underage)', () => {
    const deployed = deploy(18n);
    const contract = new Contract({});
    const ctx = makeCircuitCtx(deployed.currentContractState);
    try { contract.circuits.verify(ctx, 16n); } catch { /* expected */ }
    // minimumAge should still be 18, success still false
    const l = ledger(ctx.currentQueryContext.state.state);
    expect(l.minimumAge).toBe(18n);
    expect(l.lastVerificationSuccess).toBe(false);
  });
});
