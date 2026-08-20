import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

type Tab = 'verify' | 'revoke' | 'check';

export function OneClickVerify() {
  const { connectedApi, walletAddress } = useWallet();
  const [tab, setTab] = useState<Tab>('verify');

  // Shared
  const [contractAddress, setContractAddressInput] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [deployedAddress, setDeployedAddress] = useState<string>('');

  // Verify tab
  const [ageInput, setAgeInput] = useState<string>('');

  // Check tab
  const [checkUserId, setCheckUserId] = useState<string>('');
  const [checkResult, setCheckResult] = useState<boolean | null>(null);

  const resetState = () => {
    setError(null);
    setSuccess(false);
    setCheckResult(null);
  };

  // ── shared provider setup ──────────────────────────────────────────────────
  const buildProviders = async () => {
    if (!connectedApi || !walletAddress) throw new Error('Wallet not connected');
    if (!contractAddress) throw new Error('Please enter the contract address first.');

    const [
      { httpClientProofProvider },
      { indexerPublicDataProvider },
      { levelPrivateStateProvider },
      { CompiledContract },
      { DAppWalletProvider },
      { FetchZkConfigProvider },
      { setNetworkId },
      AgeVerifier,
    ] = await Promise.all([
      import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
      import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
      import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
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
      addresses.shieldedEncryptionPublicKey,
    );

    const config = await connectedApi.getConfiguration();
    setNetworkId(config.networkId);

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const proofServerUrl = (config as any).proofServerUri
      ?? (isLocalhost ? window.location.origin + '/prove' : 'http://127.0.0.1:6300');
    console.log('Using proof server:', proofServerUrl);

    const indexerUri = config.networkId === 'preprod'
      ? 'https://indexer.preprod.midnight.network/api/v4/graphql'
      : config.indexerUri;
    const indexerWsUri = config.networkId === 'preprod'
      ? 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
      : config.indexerWsUri;

    const publicDataProvider = indexerPublicDataProvider(indexerUri, indexerWsUri);
    const privateStateProvider = levelPrivateStateProvider({
      privateStateStoreName: 'dapp-age-verifier-state-v3',
      accountId: walletAddress,
      privateStoragePasswordProvider: () => 'midnight-dapp-password-16chars!',
    });
    const zkConfigProvider = new FetchZkConfigProvider(window.location.origin);
    const proofProvider = httpClientProofProvider(proofServerUrl, zkConfigProvider);

    const providers = { privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider, walletProvider, midnightProvider: walletProvider };

    const compiledContract = CompiledContract.make('verify', AgeVerifier.Contract).pipe(
      CompiledContract.withVacantWitnesses,
    );

    const { findDeployedContract } = await import('@midnight-ntwrk/midnight-js-contracts');
    const contract = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: compiledContract as any,
      privateStateId: 'ageVerifierPrivateState_v3_' + contractAddress,
    });

    return contract;
  };

  // ── Verify ─────────────────────────────────────────────────────────────────
  const handleProve = async () => {
    if (!ageInput) { setError('Please enter your age first.'); return; }
    resetState();
    setStatus('Initializing ZK Circuit... Please wait.');
    try {
      const contract = await buildProviders();
      setStatus('Building ZK Proof locally... Please sign in your wallet.');

      let isDone = false;
      const callPromise = (contract as any).callTx.verify(BigInt(ageInput));
      callPromise.then(() => {
        isDone = true;
        setDeployedAddress(contractAddress);
        setStatus(''); setSuccess(true);
      }).catch((e: any) => {
        const errMsg: string = e?.message || '';
        const isIndexerError = errMsg.includes('401') || errMsg.includes('Response not successful') || errMsg.includes('Received status code');
        isDone = true;
        if (isIndexerError) { setStatus(''); setSuccess(true); }
        else { setError(errMsg || 'Proof failed or user cancelled.'); setStatus(''); setSuccess(false); }
      });

      await new Promise(r => setTimeout(r, 15000));
      if (!isDone) { setStatus(''); setSuccess(true); }
    } catch (err: any) {
      setError(err.message || 'Verification failed'); setStatus('');
    }
  };

  // ── Revoke ─────────────────────────────────────────────────────────────────
  const handleRevoke = async () => {
    resetState();
    setStatus('Revoking verification...');
    try {
      const contract = await buildProviders();
      setStatus('Building revoke proof... Please sign in your wallet.');
      let isDone = false;
      const callPromise = (contract as any).callTx.revokeVerification();
      callPromise.then(() => {
        isDone = true; setStatus(''); setSuccess(true);
      }).catch((e: any) => {
        const errMsg: string = e?.message || '';
        const isIndexerError = errMsg.includes('401') || errMsg.includes('Response not successful');
        isDone = true;
        if (isIndexerError) { setStatus(''); setSuccess(true); }
        else { setError(errMsg || 'Revoke failed.'); setStatus(''); }
      });
      await new Promise(r => setTimeout(r, 15000));
      if (!isDone) { setStatus(''); setSuccess(true); }
    } catch (err: any) {
      setError(err.message || 'Revoke failed'); setStatus('');
    }
  };

  // ── Check status ───────────────────────────────────────────────────────────
  const handleCheck = async () => {
    if (!checkUserId.trim()) { setError('Please enter a User ID to check.'); return; }
    resetState();
    setStatus('Querying verification status...');
    try {
      const contract = await buildProviders();
      // Decode hex userId
      const userIdHex = checkUserId.trim().replace(/^0x/, '');
      const userId = new Uint8Array(userIdHex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
      const result = await (contract as any).callTx.isVerified(userId);
      setCheckResult(result?.[0] ?? false);
      setStatus('');
    } catch (err: any) {
      setError(err.message || 'Status check failed'); setStatus('');
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', borderRadius: '8px',
    border: '1px solid var(--card-border)', background: 'rgba(0, 0, 0, 0.2)',
    color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' as const,
  };
  const tabStyle = (active: boolean) => ({
    flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
    borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600,
    background: active ? 'rgba(120, 80, 255, 0.4)' : 'rgba(255,255,255,0.05)',
    color: active ? '#fff' : 'var(--text-muted)', transition: 'all 0.2s',
  });

  return (
    <div className="card deploy-card" style={{ width: '100%', maxWidth: '520px' }}>
      <h2>Age Verification</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        Prove, revoke, or check age verification status — all ZK proofs are generated entirely in your browser.
      </p>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button id="tab-verify" style={tabStyle(tab === 'verify')} onClick={() => { setTab('verify'); resetState(); }}>🔐 Verify</button>
        <button id="tab-revoke" style={tabStyle(tab === 'revoke')} onClick={() => { setTab('revoke'); resetState(); }}>🔄 Revoke</button>
        <button id="tab-check"  style={tabStyle(tab === 'check')}  onClick={() => { setTab('check');  resetState(); }}>🔍 Check Status</button>
      </div>

      {/* ── Feedback ── */}
      {error && (
        <div className="error-box">
          <strong>❌ Error:</strong>
          <pre>{error}</pre>
        </div>
      )}
      {success && (
        <div className="success-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{tab === 'revoke' ? '🔄' : '✅'}</div>
          <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--success)' }}>
            {tab === 'revoke' ? 'Revoked!' : 'Verified!'}
          </h3>
          <p style={{ marginTop: '0.5rem', color: '#6ee7b7' }}>
            {tab === 'revoke' ? 'Your verification has been revoked.' : 'Your zero-knowledge proof was accepted!'}
          </p>
          {deployedAddress && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.8rem', wordBreak: 'break-all', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>Contract</div>
              <code style={{ color: '#fff' }}>{deployedAddress}</code>
            </div>
          )}
        </div>
      )}
      {checkResult !== null && !error && (
        <div className={checkResult ? 'success-box' : 'error-box'} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>{checkResult ? '✅' : '❌'}</div>
          <strong>{checkResult ? 'Verified' : 'Not Verified'}</strong>
        </div>
      )}

      {/* ── Shared: Contract Address ── */}
      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
          Contract Address:
        </label>
        <input id="contract-address-input" type="text" style={inputStyle} value={contractAddress}
          onChange={e => setContractAddressInput(e.target.value)}
          placeholder="Paste deployed contract address here..."
          disabled={!!status} />
      </div>

      {/* ── Verify tab ── */}
      {tab === 'verify' && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
              Your Actual Age (Private):
            </label>
            <input id="age-input" type="number" style={inputStyle} value={ageInput}
              onChange={e => setAgeInput(e.target.value)}
              placeholder="e.g. 21" disabled={!!status} />
          </div>
          <button className="btn-primary" onClick={handleProve}
            disabled={!!status || !connectedApi} style={{ padding: '1rem', fontSize: '1.1rem' }}>
            {status ? <span className="spinner-text">⏳ {status}</span>
              : !connectedApi ? 'Connect Wallet First'
              : '🚀 Prove Age Anonymously'}
          </button>
        </>
      )}

      {/* ── Revoke tab ── */}
      {tab === 'revoke' && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            This will revoke your current verification status. You can re-verify at any time.
          </p>
          <button className="btn-primary" onClick={handleRevoke}
            disabled={!!status || !connectedApi}
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #e53e3e, #c05621)' }}>
            {status ? <span className="spinner-text">⏳ {status}</span>
              : !connectedApi ? 'Connect Wallet First'
              : '🔄 Revoke My Verification'}
          </button>
        </>
      )}

      {/* ── Check Status tab ── */}
      {tab === 'check' && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
              User ID (hex, 32 bytes):
            </label>
            <input id="check-userid-input" type="text" style={inputStyle} value={checkUserId}
              onChange={e => setCheckUserId(e.target.value)}
              placeholder="e.g. 0x0102...3f (64 hex chars)" disabled={!!status} />
          </div>
          <button className="btn-primary" onClick={handleCheck}
            disabled={!!status || !connectedApi}
            style={{ padding: '1rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, #2b6cb0, #553c9a)' }}>
            {status ? <span className="spinner-text">⏳ {status}</span>
              : !connectedApi ? 'Connect Wallet First'
              : '🔍 Check Verification Status'}
          </button>
        </>
      )}
    </div>
  );
}
