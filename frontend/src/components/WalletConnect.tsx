import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';

function getAvailableWalletKeys(): string[] {
  const found: string[] = [];
  const midnightObj = window.midnight;
  if (!midnightObj) return found;
  for (const key of Object.keys(midnightObj)) {
    if (typeof (midnightObj[key] as any)?.connect === 'function') {
      found.push(key);
    }
  }
  return found;
}

export const WalletConnect: React.FC = () => {
  const {
    walletAddress,
    networkId,
    balance,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [availableWallets, setAvailableWallets] = useState<string[]>([]);
  const [windowMidnightKeys, setWindowMidnightKeys] = useState<string[]>([]);

  useEffect(() => {
    // Give the extension 500ms to inject itself
    const timer = setTimeout(() => {
      const keys = getAvailableWalletKeys();
      setAvailableWallets(keys);
      const allKeys = window.midnight ? Object.keys(window.midnight) : [];
      setWindowMidnightKeys(allKeys);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const formatBalance = (bal: string) => {
    try {
      return BigInt(bal).toLocaleString();
    } catch {
      return bal;
    }
  };

  return (
    <div className="card wallet-card">
      <div className="wallet-header">
        <h2>Wallet Connection</h2>
        <div className={`status-indicator ${walletAddress ? 'connected' : 'disconnected'}`}></div>
      </div>

      {error && <div className="error-box"><strong>Error:</strong> {error}</div>}

      {!walletAddress ? (
        <div className="wallet-disconnected">
          {availableWallets.length > 0 ? (
            <>
              <p>
                Detected wallet{availableWallets.length > 1 ? 's' : ''}: <strong className="wallet-badge">{availableWallets.join(', ')}</strong>
              </p>
              {availableWallets.length === 1 ? (
                <button
                  className="btn-primary"
                  onClick={() => connectWallet(availableWallets[0])}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : `Connect (${availableWallets[0]})`}
                </button>
              ) : (
                <div className="wallet-list">
                  {availableWallets.map(key => (
                    <button
                      key={key}
                      className="btn-primary wallet-btn"
                      onClick={() => connectWallet(key)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Connecting...' : `Connect "${key}"`}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : windowMidnightKeys.length > 0 ? (
            <>
              <p className="hint-text">
                Found <code>window.midnight</code> with keys: <strong>[{windowMidnightKeys.join(', ')}]</strong>
                <br />
                But no wallet with a <code>connect()</code> method was found.
              </p>
              <p className="hint-text">Your wallet may use a different API. Check the browser console for details.</p>
              <button className="btn-primary" onClick={() => connectWallet()} disabled={isConnecting}>
                Try Connect Anyway
              </button>
            </>
          ) : (
            <>
              <p>No Midnight wallet detected in this browser yet.</p>
              <p className="hint-text">Make sure your Midnight wallet extension is enabled and the page has loaded.</p>
              <button
                className="btn-primary"
                onClick={() => connectWallet()}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="wallet-connected">
          <div className="info-row">
            <span className="label">Address:</span>
            <span className="value truncate" title={walletAddress}>
              {walletAddress.substring(0, 14)}...{walletAddress.substring(walletAddress.length - 8)}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Network:</span>
            <span className="value capitalize">{networkId ?? 'Unknown'}</span>
          </div>
          <div className="info-row">
            <span className="label">Balance:</span>
            <span className="value">{balance !== null ? `${formatBalance(balance)} tNight` : '...'}</span>
          </div>
          <button className="btn-secondary mt-1" onClick={disconnectWallet}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
