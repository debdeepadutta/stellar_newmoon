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
  proofData: __compactRuntime.PartialProofData;
  gasCost: __compactRuntime.RunningCost;
}

// ── Contract ──────────────────────────────────────────────────────────────────
export declare class Contract<W extends Partial<AgeVerifierWitnesses> = AgeVerifierWitnesses> {
  readonly witnesses: W;

  constructor(witnesses: W);

  /**
   * Deploys the contract with a minimum age threshold.
   * @param threshold Must be >= 18; stored as `minimumAge` in the ledger.
   */
  initialState(
    context: CircuitContext<AgeVerifierPrivateState>,
    threshold: bigint,
  ): {
    currentContractState: __compactRuntime.ContractState;
    currentPrivateState: AgeVerifierPrivateState;
    currentZswapLocalState: unknown;
    proofData: __compactRuntime.PartialProofData;
    gasCost: __compactRuntime.RunningCost;
  };

  circuits: {
    /**
     * Proves age >= minimumAge (and 0 < age < 150) privately.
     * Sets verifications[getUserId()] = true in the ledger.
     * @param myAge Caller's private age — never written on-chain.
     */
    verify: (
      context: CircuitContext<AgeVerifierPrivateState>,
      myAge: bigint,
    ) => CircuitResults<[]>;

    /**
     * Revokes the caller's own prior verification.
     * Sets verifications[getUserId()] = false.
     */
    revokeVerification: (
      context: CircuitContext<AgeVerifierPrivateState>,
    ) => CircuitResults<[]>;

    /**
     * Read-only query — returns current verification status for any userId.
     * Does not require private input.
     * @param userId The 32-byte identity commitment to query.
     */
    isVerified: (
      context: CircuitContext<AgeVerifierPrivateState>,
      userId: Uint8Array,
    ) => CircuitResults<[boolean]>;
  };
}

// ── ledger() helper ───────────────────────────────────────────────────────────
export declare function ledger(
  stateOrChargedState:
    | __compactRuntime.StateValue
    | __compactRuntime.ChargedState
    | __compactRuntime.ContractState,
): AgeVerifierLedger;

export declare const contractReferenceLocations: __compactRuntime.ContractReferenceLocations;
