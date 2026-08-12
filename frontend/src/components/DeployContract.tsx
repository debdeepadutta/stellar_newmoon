import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export const DeployContract: React.FC = () => {
  const { connectedApi, walletAddress } = useWallet();
  const [deploying, setDeploying] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [minAgeInput, setMinAgeInput] = useState<string>('18');

  const handleDeploy = async () => {
    if (!connectedApi || !walletAddress) return;

    setDeploying(true);
    setError(null);
    setContractAddress(null);
    setStatus('Loading SDK modules...');

    try {
      // Dynamic imports to prevent module-level crashes
      const [
        { deployContract },
        { httpClientProofProvider },
        { indexerPublicDataProvider },
        { levelPrivateStateProvider },
        { CompiledContract },
        { DAppWalletProvider },
        { FetchZkConfigProvider },
        { setNetworkId },
        AgeVerifier,
      ] = await Promise.all([
        import('@midnight-ntwrk/midnight-js-contracts'),
        import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
        import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
        import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
        import('@midnight-ntwrk/midnight-js-protocol/compact-js'),
        import('../providers/DAppWalletProvider'),
        import('../providers/FetchZkConfigProvider'),
        import('@midnight-ntwrk/midnight-js-network-id'),
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

      // Use Vite proxy for proof server (proxied via /prove -> 127.0.0.1:6300)
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

      setStatus('Building compiled contract...');
      const compiledContract = CompiledContract.make('deploy', AgeVerifier.Contract).pipe(
        CompiledContract.withVacantWitnesses,
      );

      setStatus('Deploying... Please approve in your Lace wallet.');
      const deployed = await deployContract(providers as any, {
        compiledContract: compiledContract as any,
        privateStateId: 'ageVerifierPrivateState_' + Date.now(),
        initialPrivateState: {},
        args: [BigInt(minAgeInput)],
      });

      const addr = deployed.deployTxData.public.contractAddress;
      setStatus('');
      setContractAddress(addr);
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || String(err));
      setStatus('');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="card deploy-card">
      <h2>Age Verifier Contract</h2>
      <p>Deploy a contract that establishes a minimum age requirement.</p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Minimum Age:</label>
        <input 
          type="number" 
          value={minAgeInput} 
          onChange={(e) => setMinAgeInput(e.target.value)}
          disabled={deploying || !connectedApi}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444', background: '#2a2f3a', color: 'white' }}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleDeploy}
        disabled={deploying || !connectedApi}
      >
        {deploying ? (
          <span className="spinner-text">⏳ {status || 'Deploying...'}</span>
        ) : (
          '🚀 Deploy Age Verifier'
        )}
      </button>

      {!connectedApi && (
        <p className="hint-text">Connect your wallet first to enable deployment.</p>
      )}

      {status && !deploying && <p className="status-message">{status}</p>}

      {error && (
        <div className="error-box">
          <strong>❌ Error:</strong>
          <pre>{error}</pre>
        </div>
      )}

      {contractAddress && (
        <div className="success-box">
          <h3>✅ Contract Deployed!</h3>
          <p><strong>Contract Address:</strong></p>
          <code className="address-display">{contractAddress}</code>
        </div>
      )}
    </div>
  );
};
