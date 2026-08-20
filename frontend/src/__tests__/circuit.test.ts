/**
 * Circuit-level tests for the multi-user age-verifier contract.
 *
 * Covers:
 *  1. Constructor-Logic   — threshold guard, minimumAge storage, empty verifications
 *  2. Circuit-Logic       — range validation, threshold check, per-user Map updates
 *  3. Multi-User          — two users don't overwrite each other's status
 *  4. Lifecycle           — revoke flips status back to false
 *  5. isVerified          — read-only circuit reflects current state
 */

import { describe, it, expect } from 'vitest';
import {
  Contract,
  ledger,
  type AgeVerifierPrivateState,
} from '../contracts/age-verifier/index.js';
import {
  QueryContext,
  ChargedState,
  StateValue,
  CostModel,
  CompactError,
  dummyContractAddress,
  emptyZswapLocalState,
} from '@midnight-ntwrk/compact-runtime';
import type { CircuitContext } from '@midnight-ntwrk/compact-runtime';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUserId(seed: number): Uint8Array {
  const id = new Uint8Array(32);
  id[0] = seed;
  return id;
}

const USER_A = makeUserId(0x01);
const USER_B = makeUserId(0x02);

/**
 * Deploy the contract and return its state.
 */
function deploy(threshold: bigint, userId: Uint8Array = USER_A) {
  const contract = new Contract({ getUserId: () => userId });
  const ctx = makeConstructorCtx();
  return contract.initialState(ctx, threshold);
}

function makeConstructorCtx(): CircuitContext<AgeVerifierPrivateState> {
  const sv = new (QueryContext as any)(
    new ChargedState(StateValue.newNull()),
    dummyContractAddress(),
  );
  return {
    currentQueryContext: sv,
    currentPrivateState: { _verifications: new Map() },
    currentZswapLocalState: emptyZswapLocalState({ coinPublicKey: new Uint8Array(32) }),
    costModel: CostModel.initialCostModel(),
    gasLimit: 0n,
  };
}

/**
 * Build a CircuitContext from a deployed contract state.
 */
function makeCircuitCtx(
  deployed: ReturnType<typeof deploy>,
  userId: Uint8Array = USER_A,
): CircuitContext<AgeVerifierPrivateState> {
  return {
    currentQueryContext: new QueryContext(
      deployed.currentContractState.data,
      dummyContractAddress(),
    ),
    currentPrivateState: deployed.currentPrivateState,
    currentZswapLocalState: emptyZswapLocalState({ coinPublicKey: new Uint8Array(32) }),
    costModel: CostModel.initialCostModel(),
    gasLimit: 0n,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Constructor-Logic
// ─────────────────────────────────────────────────────────────────────────────
describe('Constructor-Logic', () => {
  it('deploys successfully with threshold 18', () => {
    expect(() => deploy(18n)).not.toThrow();
  });

  it('deploys successfully with threshold 21', () => {
    expect(() => deploy(21n)).not.toThrow();
  });

  it('deploys successfully with threshold 100', () => {
    expect(() => deploy(100n)).not.toThrow();
  });

  it('stores the exact threshold as minimumAge in the ledger', () => {
    const result = deploy(21n);
    const l = ledger(result.currentContractState.data);
    expect(l.minimumAge).toBe(21n);
  });

  it('rejects threshold below 18', () => {
    expect(() => deploy(17n)).toThrow(CompactError);
    expect(() => deploy(17n)).toThrow('Threshold must be at least 18');
  });

  it('rejects threshold of 0', () => {
    expect(() => deploy(0n)).toThrow(CompactError);
  });

  it('rejects a non-bigint threshold', () => {
    const contract = new Contract({});
    const ctx = makeConstructorCtx();
    expect(() => (contract as any).initialState(ctx, 18)).toThrow(TypeError);
  });

  it('initialises verifications map as empty (no user verified)', () => {
    const result = deploy(18n, USER_A);
    const verifs = result.currentPrivateState._verifications;
    expect(verifs.size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Circuit-Logic — verify()
// ─────────────────────────────────────────────────────────────────────────────
describe('Circuit-Logic — verify(myAge) assertions', () => {
  it('throws CompactError when age is below threshold', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 17n)).toThrow(CompactError);
    expect(() => contract.circuits.verify(ctx, 17n)).toThrow('minimum age requirement');
  });

  it('throws CompactError when age is 0 (range check)', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 0n)).toThrow(CompactError);
    expect(() => contract.circuits.verify(ctx, 0n)).toThrow('positive');
  });

  it('throws CompactError when age >= 150 (range check)', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 150n)).toThrow(CompactError);
    expect(() => contract.circuits.verify(ctx, 150n)).toThrow('valid range');
    expect(() => contract.circuits.verify(ctx, 200n)).toThrow(CompactError);
  });

  it('succeeds when age equals threshold exactly', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 18n)).not.toThrow();
  });

  it('succeeds when age is well above threshold', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 45n)).not.toThrow();
  });

  it('succeeds with highest valid age (149)', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 149n)).not.toThrow();
  });

  it('throws TypeError for a non-bigint myAge', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => (contract as any).circuits.verify(ctx, 25)).toThrow(TypeError);
  });

  it('correctly uses a custom threshold of 21', () => {
    const deployed = deploy(21n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => contract.circuits.verify(ctx, 20n)).toThrow(CompactError);
    expect(() => contract.circuits.verify(ctx, 21n)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Ledger-State-Transition — per-user Map
// ─────────────────────────────────────────────────────────────────────────────
describe('Ledger-State-Transition — per-user Map', () => {
  it('sets the correct user entry to true after verify()', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const result = contract.circuits.verify(ctx, 25n);
    // Check via isVerified circuit
    const check = contract.circuits.isVerified(result.context, USER_A);
    expect(check.result[0]).toBe(true);
  });

  it('unverified user returns false from isVerified', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const check = contract.circuits.isVerified(ctx, USER_B);
    expect(check.result[0]).toBe(false);
  });

  it('minimumAge is unchanged after verify()', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const result = contract.circuits.verify(ctx, 25n);
    const l = ledger(result.context.currentQueryContext.state);
    expect(l.minimumAge).toBe(18n);
  });

  it('verify() does not mutate state when it throws', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    try { contract.circuits.verify(ctx, 10n); } catch { /* expected */ }
    const check = contract.circuits.isVerified(ctx, USER_A);
    expect(check.result[0]).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Multi-User — two users verify independently
// ─────────────────────────────────────────────────────────────────────────────
describe('Multi-User — independent per-user status', () => {
  it('user A and user B statuses do not overwrite each other', () => {
    const deployed = deploy(18n, USER_A);
    const contractA = new Contract({ getUserId: () => USER_A });
    const contractB = new Contract({ getUserId: () => USER_B });

    // User A verifies first
    const ctxA = makeCircuitCtx(deployed, USER_A);
    const afterA = contractA.circuits.verify(ctxA, 25n);

    // User B verifies using the context after A's verify
    const ctxB = { ...afterA.context };
    const afterB = contractB.circuits.verify(ctxB, 30n);

    // Both should be verified
    const checkA = contractA.circuits.isVerified(afterB.context, USER_A);
    const checkB = contractB.circuits.isVerified(afterB.context, USER_B);
    expect(checkA.result[0]).toBe(true);
    expect(checkB.result[0]).toBe(true);
  });

  it('verifying user B does not affect user A\'s status', () => {
    const deployed = deploy(18n, USER_A);
    const contractA = new Contract({ getUserId: () => USER_A });
    const contractB = new Contract({ getUserId: () => USER_B });

    const ctxA = makeCircuitCtx(deployed, USER_A);
    const afterA = contractA.circuits.verify(ctxA, 25n);
    const afterB = contractB.circuits.verify(afterA.context, 30n);

    const checkA = contractA.circuits.isVerified(afterB.context, USER_A);
    expect(checkA.result[0]).toBe(true);
  });

  it('a failed verify for user B does not affect user A\'s status', () => {
    const deployed = deploy(18n, USER_A);
    const contractA = new Contract({ getUserId: () => USER_A });
    const contractB = new Contract({ getUserId: () => USER_B });

    const ctxA = makeCircuitCtx(deployed, USER_A);
    const afterA = contractA.circuits.verify(ctxA, 25n);

    // User B tries to verify with underage — should fail
    try { contractB.circuits.verify(afterA.context, 10n); } catch { /* expected */ }

    const checkA = contractA.circuits.isVerified(afterA.context, USER_A);
    expect(checkA.result[0]).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Lifecycle — revoke
// ─────────────────────────────────────────────────────────────────────────────
describe('Lifecycle — revokeVerification()', () => {
  it('revoke sets the user\'s status back to false', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);

    const afterVerify = contract.circuits.verify(ctx, 25n);
    const checkBefore = contract.circuits.isVerified(afterVerify.context, USER_A);
    expect(checkBefore.result[0]).toBe(true);

    const afterRevoke = contract.circuits.revokeVerification(afterVerify.context);
    const checkAfter = contract.circuits.isVerified(afterRevoke.context, USER_A);
    expect(checkAfter.result[0]).toBe(false);
  });

  it('revoking user A does not affect user B', () => {
    const deployed = deploy(18n, USER_A);
    const contractA = new Contract({ getUserId: () => USER_A });
    const contractB = new Contract({ getUserId: () => USER_B });

    const ctxA = makeCircuitCtx(deployed, USER_A);
    const afterA = contractA.circuits.verify(ctxA, 25n);
    const afterB = contractB.circuits.verify(afterA.context, 30n);

    // Revoke user A
    const afterRevoke = contractA.circuits.revokeVerification(afterB.context);

    expect(contractA.circuits.isVerified(afterRevoke.context, USER_A).result[0]).toBe(false);
    expect(contractB.circuits.isVerified(afterRevoke.context, USER_B).result[0]).toBe(true);
  });

  it('user can re-verify after revoking', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);

    const afterVerify = contract.circuits.verify(ctx, 25n);
    const afterRevoke = contract.circuits.revokeVerification(afterVerify.context);

    // Should be able to verify again
    const afterReVerify = contract.circuits.verify(afterRevoke.context, 30n);
    expect(contract.circuits.isVerified(afterReVerify.context, USER_A).result[0]).toBe(true);
  });

  it('revoking without prior verification sets to false (idempotent)', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const afterRevoke = contract.circuits.revokeVerification(ctx);
    expect(contract.circuits.isVerified(afterRevoke.context, USER_A).result[0]).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. isVerified — read-only circuit
// ─────────────────────────────────────────────────────────────────────────────
describe('isVerified — read-only query circuit', () => {
  it('returns false for a userId with no prior verification', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const result = contract.circuits.isVerified(ctx, USER_A);
    expect(result.result[0]).toBe(false);
  });

  it('returns true immediately after verify()', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const afterVerify = contract.circuits.verify(ctx, 21n);
    const result = contract.circuits.isVerified(afterVerify.context, USER_A);
    expect(result.result[0]).toBe(true);
  });

  it('returns false after revokeVerification()', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const afterVerify = contract.circuits.verify(ctx, 21n);
    const afterRevoke = contract.circuits.revokeVerification(afterVerify.context);
    const result = contract.circuits.isVerified(afterRevoke.context, USER_A);
    expect(result.result[0]).toBe(false);
  });

  it('isVerified does not mutate state', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    const afterVerify = contract.circuits.verify(ctx, 21n);
    // Call isVerified twice, state should be same both times
    const r1 = contract.circuits.isVerified(afterVerify.context, USER_A);
    const r2 = contract.circuits.isVerified(afterVerify.context, USER_A);
    expect(r1.result[0]).toBe(true);
    expect(r2.result[0]).toBe(true);
  });

  it('throws TypeError for invalid userId', () => {
    const deployed = deploy(18n, USER_A);
    const contract = new Contract({ getUserId: () => USER_A });
    const ctx = makeCircuitCtx(deployed, USER_A);
    expect(() => (contract as any).circuits.isVerified(ctx, 'not-bytes')).toThrow(TypeError);
    expect(() => (contract as any).circuits.isVerified(ctx, new Uint8Array(16))).toThrow(TypeError);
  });
});
