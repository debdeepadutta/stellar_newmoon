# Midnight Age Verifier
> A privacy-preserving zero-knowledge dApp that proves you meet an age requirement without revealing your actual age.

## Live Demo
[https://stellar-newmoon-zn9z.vercel.app](https://stellar-newmoon-zn9z.vercel.app)

## Contract Address
| Network  | Address                          |
|----------|----------------------------------|
| Preview  | 2029da66063cbe10b5a8c88aaefde089b59eb87a2341cfb0fc3b5613da0c28b3    |



## What This Does
This dApp allows users to prove they are at least 18 years old using a Zero-Knowledge Proof. Instead of submitting their birthdate or exact age to a public server or blockchain, the user inputs their age locally. The Midnight network generates a mathematical proof that the condition (`age >= 18`) is met, and only that cryptographic proof is submitted to the blockchain.

## Privacy Model
- **What is PUBLIC:** The minimum age requirement (18) and the boolean state indicating if the verification was successful.
- **What is PRIVATE:** The user's actual age.
- **What the user PROVES without revealing:** The user proves that their private age is greater than or equal to 18 without ever revealing the exact number.

## Privacy Claim
**On-chain observers** can see that a contract deployment and verification transaction occurred successfully, confirming the user meets the age criteria. They **cannot see** the user's actual age, which remains completely confidential, is never transmitted over the network, and is never recorded on the ledger.

## Tech Stack
Midnight network, Compact, Midnight.js SDK, React/Vite, Lace wallet

## Prerequisites
- Lace wallet installed
- Node.js v22

## Run Locally

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd mn-demo
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser to interact with the dApp.

## Tests and CI/CD
This project includes automated tests for the frontend that mock wallet interactions.
To run tests locally:
```bash
cd frontend
npm run test
```
Continuous Integration is configured via GitHub Actions. On every push to `main`, the `.github/workflows/ci.yml` pipeline automatically installs dependencies, checks types, and runs all application tests.

## Demo Video
[Watch the Live Demo Recording](https://drive.google.com/file/d/1Kp8JfNEO_S2K9DEA0CZzRRbc11JrSQc4/view?usp=sharing)
