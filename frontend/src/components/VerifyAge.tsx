import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export const VerifyAge: React.FC = () => {
  const { connectedApi, walletAddress } = useWallet();
  const [verifying, setVerifying] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [myAgeInput, setMyAgeInput] = useState<string>('21');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleVerify = async () => {
    if (!connectedApi || !walletAddress || !contractAddress) return;

    setVerifying(true);
    setError(null);
    setSuccess(false);
    setStatus('Loading SDK modules...');

    try {
      const [
        { httpClientProofProvider },
        { indexerPublicDataProvider },
        { levelPrivateStateProvider },
        { DAppWalletProvider },
        { FetchZkConfigProvider },
        { setNetworkId },
        { Contract },
        AgeVerifier,
      ] = await Promise.all([
        import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
        import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
        import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
        import('../providers/DAppWalletProvider'),
        import('../providers/FetchZkConfigProvider'),
        import('@midnight-ntwrk/midnight-js-network-id'),
        import('@midnight-ntwrk/midnight-js-contracts'),
        import('../contracts/age-verifier/index.js'),
      ]);

      setStatus('Fetching wallet keys...');
      const addresses = await connectedApi.getShieldedAddresses();
      const walletProvider = new DAppWalletProvider(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey
      );

      setStatus('Reading wallet configuration...');
      const config = await connectedApi.getConfiguration();
      setNetworkId(config.networkId);

      const proofServerUrl = window.location.origin + '/prove';
      const zkConfigProvider = new FetchZkConfigProvider(window.location.origin);
      const publicDataProvider = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);

      const privateStateProvider = levelPrivateStateProvider({
        privateStateStoreName: 'dapp-age-verifier-state',
        accountId: walletAddress,
        privateStoragePasswordProvider: () => 'midnight-dapp-password-16chars!',
      });

      const proofProvider = httpClientProofProvider(proofServerUrl, zkConfigProvider);

      const providers = {
        privateStateProvider,
        publicDataProvider,
        zkConfigProvider,
        proofProvider,
        walletProvider,
        midnightProvider: walletProvider,
      };

      setStatus('Connecting to contract...');
      const contract = await Contract.build(
        providers as any,
        contractAddress,
        AgeVerifier.Contract,
        AgeVerifier.createContractString('verify') // This must match the circuit name you want to call
      );

      setStatus('Proving age... (Your age is kept private!)');
      // Calling the verify circuit with the private input
      const tx = await contract.callTx.verify(BigInt(myAgeInput));
      
      setStatus('Waiting for wallet approval...');
      await walletProvider.submitTx(tx);
      
      setStatus('');
      setSuccess(true);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || String(err));
      setStatus('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="card deploy-card" style={{ marginTop: '2rem' }}>
      <h2>Age Verification (Privacy Preserving)</h2>
      <p>Prove that you meet the minimum age requirement without revealing your actual age to the blockchain!</p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contract Address:</label>
        <input 
          type="text" 
          value={contractAddress} 
          onChange={(e) => setContractAddress(e.target.value)}
          placeholder="Paste deployed contract address here..."
          disabled={verifying || !connectedApi}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2f3a', color: 'white' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Your Actual Age (Private):</label>
        <input 
          type="number" 
          value={myAgeInput} 
          onChange={(e) => setMyAgeInput(e.target.value)}
          disabled={verifying || !connectedApi}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2f3a', color: 'white' }}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleVerify}
        disabled={verifying || !connectedApi || !contractAddress}
      >
        {verifying ? (
          <span className="spinner-text">⏳ {status || 'Verifying...'}</span>
        ) : (
          '🔐 Verify Age Anonymously'
        )}
      </button>

      {!connectedApi && (
        <p className="hint-text">Connect your wallet first to enable verification.</p>
      )}

      {status && !verifying && <p className="status-message">{status}</p>}

      {error && (
        <div className="error-box">
          <strong>❌ Verification Failed:</strong>
          <pre>{error}</pre>
        </div>
      )}

      {success && (
        <div className="success-box">
          <h3>✅ Verification Successful!</h3>
          <p>You proved you meet the requirement without revealing your age!</p>
        </div>
      )}
    </div>
  );
};
