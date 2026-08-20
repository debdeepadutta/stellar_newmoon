import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

// ── Private state ─────────────────────────────────────────────────────────────
export interface AgeVerifierPrivateState {
  /** Per-user verification status, keyed by hex-encoded Bytes<32> userId. */
  _verifications: Map<string, boolean>;
}

// ── Ledger view ───────────────────────────────────────────────────────────────
export interface AgeVerifierLedger {
  readonly minimumAge: bigint;
}

// ── Witnesses ─────────────────────────────────────────────────────────────────
export interface AgeVerifierWitnesses {
  /**
   * Returns the caller's identity commitment (Bytes<32>).
   * This is private — never revealed on-chain.
   */
  getUserId: (
    context: __compactRuntime.WitnessContext<AgeVerifierLedger, AgeVerifierPrivateState>,
  ) => Uint8Array;
}

// ── Circuit I/O ───────────────────────────────────────────────────────────────
export type CircuitContext<PS = AgeVerifierPrivateState> =
  __compactRuntime.CircuitContext<PS>;

export interface CircuitResults<R, PS = AgeVerifierPrivateState> {
  result: R;
  context: CircuitContext<PS>;
  proofData: any;
  gasCost: __compactRuntime.RunningCost;
}

// ── Contract ──────────────────────────────────────────────────────────────────
export type Witnesses<PS> = AgeVerifierWitnesses;

export declare class Contract<PS = any, W extends Partial<AgeVerifierWitnesses> = AgeVerifierWitnesses> {
  readonly witnesses: W;

  constructor(witnesses: W);

  initialState(
    context: __compactRuntime.ConstructorContext<PS>,
    threshold: bigint,
  ): __compactRuntime.ConstructorResult<PS>;

  circuits: {
    verify: (
      context: CircuitContext<PS>,
      myAge: bigint,
    ) => CircuitResults<[], PS>;

    revokeVerification: (
      context: CircuitContext<PS>,
    ) => CircuitResults<[], PS>;

    isVerified: (
      context: CircuitContext<PS>,
      userId: Uint8Array,
    ) => CircuitResults<[boolean], PS>;
  };

  // Required by CompiledContract.make
  impureCircuits: this['circuits'];
  provableCircuits: this['circuits'];
}

// ── ledger() helper ───────────────────────────────────────────────────────────
export declare function ledger(
  stateOrChargedState:
    | __compactRuntime.StateValue
    | __compactRuntime.ChargedState
    | __compactRuntime.ContractState,
): AgeVerifierLedger;

export declare const contractReferenceLocations: __compactRuntime.ContractReferenceLocations;
