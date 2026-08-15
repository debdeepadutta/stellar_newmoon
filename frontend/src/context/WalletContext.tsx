import React, { createContext, useContext, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

interface WalletContextType {
  connectedApi: ConnectedAPI | null;
  walletAddress: string | null;
  networkId: string | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
  detectedWallets: string[];
  connectWallet: (walletKey?: string) => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

declare global {
  interface Window {
    midnight?: {
      [key: string]: InitialAPI;
    };
  }
}


function detectWallets(): string[] {
  const found: string[] = [];
  const midnightObj = window.midnight;
  if (!midnightObj) return found;
  // Include all keys that look like a wallet (have a connect method)
  for (const key of Object.keys(midnightObj)) {
    if (typeof (midnightObj[key] as any)?.connect === 'function') {
      found.push(key);
    }
  }
  return found;
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState<string[]>([]);

  const connectWallet = async (walletKey?: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      // Detect all available wallets first
      const available = detectWallets();
      setDetectedWallets(available);

      if (available.length === 0) {
        // Check if window.midnight exists at all but has no connect methods
        const allKeys = window.midnight ? Object.keys(window.midnight) : [];
        if (allKeys.length > 0) {
          throw new Error(
            `Found window.midnight with keys [${allKeys.join(', ')}] but none have a connect() method. ` +
            `Your wallet extension may use a different API format.`
          );
        }
        throw new Error(
          'No Midnight wallet extension detected. Make sure your wallet extension is installed and enabled in this browser.'
        );
      }

      // Use provided key, or pick mnLace if available, else the first detected wallet
      const key = walletKey ?? (available.includes('mnLace') ? 'mnLace' : available[0]);
      const walletApi = window.midnight![key] as InitialAPI;
      if (!walletApi) {
        throw new Error(`Wallet '${key}' not found. Available: ${available.join(', ')}`);
      }

      console.log(`Connecting to wallet: "${key}"`);

      // Try connecting to testnet first, fallback to preprod
      let api: ConnectedAPI;
      try {
        api = await walletApi.connect('testnet');
      } catch (err) {
        console.log('Failed to connect to testnet, trying preprod...');
        api = await walletApi.connect('preprod');
      }
      setConnectedApi(api);

      // Fetch address
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setWalletAddress(unshieldedAddress);

      // Fetch network
      const config = await api.getConfiguration();
      setNetworkId(config.networkId);

      // Fetch balance
      const unshieldedBalances = await api.getUnshieldedBalances();
      let tNightBalance = 0n;
      for (const val of Object.values(unshieldedBalances)) {
        if (val > 0n) {
          tNightBalance = val;
          break;
        }
      }
      setBalance(tNightBalance.toString());

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setConnectedApi(null);
    setWalletAddress(null);
    setNetworkId(null);
    setBalance(null);
    setDetectedWallets([]);
  };

  return (
    <WalletContext.Provider
      value={{
        connectedApi,
        walletAddress,
        networkId,
        balance,
        isConnecting,
        error,
        detectedWallets,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
