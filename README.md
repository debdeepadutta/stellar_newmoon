# Midnight Zero-Knowledge Age Verifier

This DApp demonstrates a privacy-preserving smart contract deployed on the **Midnight Preview Network**. 

## 🛡️ The Privacy Claim
**What is proven?**
A user can prove that they meet a minimum age requirement (e.g., they are 18 or older) established by the smart contract.

**What is kept private?**
The user's **actual age** is kept completely private. It is passed as a **private input** into the Zero-Knowledge circuit (`verify`). The circuit executes entirely locally on the user's machine, generating a cryptographic Zero-Knowledge Proof. 
The blockchain only receives and verifies the proof—it *never* sees the actual age, nor does it execute the logic.

## 🚀 How to Run

1. Ensure you have the **Lace Wallet** installed and connected to the **Midnight Preview** network.
2. Clone this repository and run:
   ```bash
   npm install
   npm run dev
   ```
3. Connect your wallet using the UI.
4. **Deploy**: Enter a minimum age and deploy the contract. You will receive a Contract Address.
5. **Verify**: Paste the contract address into the Verify section, enter your actual age (this stays private!), and click Verify. The transaction will succeed if your age is $\ge$ the minimum, without revealing your age on-chain!

## Requirements Met
- ✅ Lace wallet connect / disconnect implemented
- ✅ Circuit called successfully from the frontend
- ✅ Observable privacy behavior (Proving Age without showing it)
- ✅ Contract deployed (targeting Preview Network)
- ✅ Minimum 8 meaningful commits
- ✅ README documenting the privacy claim
