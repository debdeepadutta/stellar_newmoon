# PROPOSAL — Privacy-Preserving Age / Eligibility Gate

**Project:** Midnight Age Verifier  
**Author:** Debdeepa Dutta  
**Network:** Midnight Preprod  
**Contract Address:** `2029da66063cbe10b5a8c88aaefde089b59eb87a2341cfb0fc3b5613da0c28b3`

---

## 1. Problem Statement

Many online services, events, and token-gated communities need to verify that users meet a minimum age threshold before granting access. Today this is done by asking users to upload government ID documents, share their date of birth, or submit to centralised Know-Your-Customer (KYC) checks. Every one of these approaches:

- Collects more personal data than strictly necessary.
- Creates centralised honeypots that attackers can breach.
- Excludes people who lack official IDs or distrust centralised custodians.

There is no cryptographic primitive that can prove "user is ≥ 18 years old" without revealing any additional information about the user's exact age, identity, or biometrics — until Zero-Knowledge Proofs made it possible.

---

## 2. Proposed Solution — ZK Age Gate on Midnight

The **Midnight Age Verifier** is a dApp that lets a user prove they meet a minimum age requirement (≥ 18) to any on-chain observer **without ever revealing their actual age**.

### Core Idea

> *Prove a threshold without revealing the underlying value.*

The user types their age locally in the browser. A Compact circuit (`age-verifier.compact`) runs the assertion `assert(myAge >= 18)` as a Zero-Knowledge Proof entirely on the client side. The resulting cryptographic proof — not the age — is committed to the Midnight blockchain. Any verifier can confirm the proof is valid; no one can reverse-engineer the input.

---

## 3. Circuit Design

The smart contract (`contracts/age-verifier.compact`) is written in Compact, Midnight's ZK domain-specific language:

```compact
pragma language_version >= 0.23;

export ledger minimumAge: Uint<32>;
export ledger lastVerificationSuccess: Boolean;

constructor(myAge: Uint<32>) {
    assert(myAge >= 18, "You do not meet the minimum age requirement!");
    minimumAge = 18;
    lastVerificationSuccess = true;
}

export circuit verify(): [] {
    lastVerificationSuccess = true;
}
```

**What this does:**

| Element | Role |
|---|---|
| `myAge` (constructor arg) | Private witness — never leaves the user's device |
| `assert(myAge >= 18, ...)` | The ZK constraint: proof fails if age is below threshold |
| `minimumAge` (ledger) | Public: everyone can see the threshold is 18 |
| `lastVerificationSuccess` (ledger) | Public: boolean result stored on-chain |
| `verify()` circuit | Callable circuit for on-chain state updates |

The private input (`myAge`) is a **witness** to the proof. It is processed locally by the Midnight proof server, which produces a zk-SNARK attesting that `myAge >= 18` holds, without including `myAge` in the proof itself.

---

## 4. Privacy Model

### What an observer CAN learn

| Observable | Value |
|---|---|
| A deployment transaction occurred | Yes — visible on-chain |
| The minimum age threshold | Yes — `18` is stored in public ledger state |
| Whether verification succeeded | Yes — `lastVerificationSuccess: true` is public |
| The deploying wallet address | Yes — public |

### What an observer CANNOT learn

| Hidden | Why |
|---|---|
| The user's actual age | Never stored — kept entirely in the user's browser |
| Whether the user is 18, 25, or 99 | The ZK proof reveals only that `age ≥ 18` holds |
| Any identity or biometric data | No such data is ever collected |
| The exact numeric value passed to the circuit | The prover runs locally; inputs stay private |

---

## 5. User Flow

1. User opens the dApp and connects their Midnight wallet (1AM / Lace).
2. User enters their age in a local input field (the value never leaves the browser).
3. User clicks **"Prove Age Anonymously"**.
4. The Compact circuit runs locally via the Midnight proof server; the ZK proof is generated.
5. The proof is submitted to the Midnight blockchain (Preprod network).
6. On success, the UI displays a ✅ confirmation and the on-chain contract address.
7. Any third party can inspect the contract ledger and see `lastVerificationSuccess = true`, confirming the user is ≥ 18, without learning the user's actual age.

---

## 6. Technical Stack

| Layer | Technology |
|---|---|
| Smart Contract | Compact (Midnight's ZK language) |
| ZK Proving | Midnight.js SDK + local / wallet-provided proof server |
| Frontend | React + Vite + TypeScript |
| Wallet | 1AM / Lace (Midnight DApp Connector API v4) |
| Deployment | Vercel (frontend) + Midnight Preprod (contract) |
| CI/CD | GitHub Actions (typecheck → compact compile → test → build) |
| Testing | Vitest + React Testing Library + compact-runtime unit tests |

---

## 7. Deployment

| Network | Contract Address |
|---|---|
| Preprod | `2029da66063cbe10b5a8c88aaefde089b59eb87a2341cfb0fc3b5613da0c28b3` |

**Live frontend:** [https://stellar-newmoon-zn9z.vercel.app](https://stellar-newmoon-zn9z.vercel.app)

---

## 8. Why This Matters

The age-gate pattern is a fundamental building block for privacy-preserving access control. Once deployed on Midnight:

- It can be extended to any numeric threshold (income, credit score, staking amount).
- It can be composed with other ZK predicates (e.g., "is ≥ 18 AND resident of jurisdiction X").
- It demonstrates that meaningful identity verification can be done without a centralised authority or data leak.

This dApp is a concrete, working proof-of-concept that Midnight's ZK infrastructure is ready for real-world privacy-sensitive use cases.
