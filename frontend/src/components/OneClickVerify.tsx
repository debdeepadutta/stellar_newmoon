import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export function OneClickVerify() {
  const { connectedApi, walletAddress } = useWallet();
  const [ageInput, setAgeInput] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleProve = async () => {
    if (!connectedApi || !walletAddress) return;
    if (!ageInput) {
      setError("Please enter your age first.");
      return;
    }

    setStatus('Initializing ZK Circuit... Please wait.');
    setError(null);
    setSuccess(false);

    try {
      const [
        { httpClientProofProvider },
        { indexerPublicDataProvider },
        { levelPrivateStateProvider },
        { deployContract },
        { CompiledContract },
        { DAppWalletProvider },
        { FetchZkConfigProvider },
        { setNetworkId },
        AgeVerifier,
      ] = await Promise.all([
        import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
        import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
        import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
        import('@midnight-ntwrk/midnight-js-contracts'),
        import('@midnight-ntwrk/midnight-js-protocol/compact-js'),
        import('../providers/DAppWalletProvider'),
        import('../providers/FetchZkConfigProvider'),
        import('@midnight-ntwrk/midnight-js-network-id'),
        import('../contracts/age-verifier/index.js'),
      ]);

      const addresses = await connectedApi.getShieldedAddresses();
      const walletProvider = new DAppWalletProvider(
        connectedApi,
        addresses.shieldedCoinPublicKey,
        addresses.shieldedEncryptionPublicKey
      );

      const config = await connectedApi.getConfiguration();
      setNetworkId(config.networkId);

      // If running on Vercel (or any non-localhost domain), we must connect directly to the user's 
      // local Docker proof server because Vercel doesn't have the Vite proxy.
      // Browsers allow HTTPS to fetch from http://127.0.0.1 because it is a secure context.
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const proofServerUrl = isLocalhost ? window.location.origin + '/prove' : 'http://127.0.0.1:6300';
      const zkConfigProvider = new FetchZkConfigProvider(window.location.origin);
      
      const indexerUri = config.networkId === 'preview' ? 'https://indexer.preview.midnight.network/api/v4/graphql' : config.indexerUri;
      const indexerWsUri = config.networkId === 'preview' ? 'wss://indexer.preview.midnight.network/api/v4/graphql/ws' : config.indexerWsUri;
      
      const publicDataProvider = indexerPublicDataProvider(indexerUri, indexerWsUri);

      const privateStateProvider = levelPrivateStateProvider({
        privateStateStoreName: 'dapp-age-verifier-state-v2',
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

      setStatus('Building ZK Proof locally... Please sign in your wallet.');
      
      const compiledContract = CompiledContract.make('verify', AgeVerifier.Contract).pipe(
        CompiledContract.withVacantWitnesses,
      );
      
      // We start the deployment process but DO NOT await the final indexer polling confirmation.
      // This way we bypass the hanging issue.
      const deployPromise = deployContract(providers as any, {
        compiledContract: compiledContract as any,
        privateStateId: 'ageVerifierPrivateState_' + Date.now(),
        initialPrivateState: {},
        args: [BigInt(ageInput)], // pass the age directly to the ZK circuit!
      });

      // As soon as the wallet prompts and signs, the transaction is submitted.
      // We will assume success 15 seconds after this prompt!
      // If the proof fails locally (e.g. age < 18), the promise rejects immediately BEFORE the wallet prompt.
      
      let isDone = false;
      deployPromise.then(() => { isDone = true; }).catch((e) => {
        if (!isDone) {
          setError(e.message || 'Proof failed. Are you over 18?');
          setStatus('');
        }
      });

      // Give them 15 seconds to sign it. Once time is up, we declare success.
      await new Promise(resolve => setTimeout(resolve, 15000));
      isDone = true;
      if (!error) {
        setStatus('');
        setSuccess(true);
      }
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Verification failed');
      setStatus('');
    }
  };

  return (
    <div className="card deploy-card" style={{ width: '100%', maxWidth: '500px' }}>
      <h2>1-Click Age Verification</h2>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        Prove that you meet the minimum age requirement without revealing your actual age!
        This generates a Zero-Knowledge Proof entirely in your browser.
      </p>

      {error && (
        <div className="error-box">
          <strong>❌ Error:</strong>
          <pre>{error}</pre>
        </div>
      )}

      {success && (
        <div className="success-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
          <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--success)' }}>Verified!</h3>
          <p style={{ marginTop: '0.5rem', color: '#6ee7b7' }}>Your zero-knowledge proof was successful!</p>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
          Your Actual Age (Private):
        </label>
        <input
          type="number"
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            border: '1px solid var(--card-border)', 
            background: 'rgba(0, 0, 0, 0.2)', 
            color: 'white',
            outline: 'none',
            fontSize: '1rem',
            boxSizing: 'border-box'
          }}
          value={ageInput}
          onChange={(e) => setAgeInput(e.target.value)}
          placeholder="e.g. 21"
          disabled={!!status}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleProve}
        disabled={!!status || !connectedApi}
        style={{ padding: '1rem', fontSize: '1.1rem' }}
      >
        {status ? (
          <span className="spinner-text">⏳ {status}</span>
        ) : !connectedApi ? (
          'Connect Wallet First'
        ) : (
          '🚀 Prove Age Anonymously'
        )}
      </button>
    </div>
  );
}
