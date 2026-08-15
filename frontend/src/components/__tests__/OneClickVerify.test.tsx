import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OneClickVerify } from '../OneClickVerify';
import * as WalletContextModule from '../../context/WalletContext';

// Mock the WalletContext
vi.mock('../../context/WalletContext', () => ({
  useWallet: vi.fn(),
}));

describe('OneClickVerify Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and prompts to connect wallet when not connected', () => {
    // Mock wallet as disconnected
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: null,
      walletAddress: null,
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    // Expect the title to be there
    expect(screen.getByText('1-Click Age Verification')).toBeInTheDocument();
    
    // Expect the button to ask for wallet connection
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Connect Wallet First');
  });

  it('enables the verify button when wallet is connected', () => {
    // Mock wallet as connected
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any, // Mock API
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    expect(button).toBeEnabled();
  });

  it('shows an error if user tries to prove without entering age', async () => {
    // Mock wallet as connected
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    // Should show error asking for age
    expect(await screen.findByText(/Please enter your age first/i)).toBeInTheDocument();
  });

  it('starts verification process when age is entered and button is clicked', async () => {
    // Mock wallet as connected with required methods
    const mockApi = {
      getShieldedAddresses: vi.fn().mockResolvedValue({
        shieldedCoinPublicKey: 'mock-coin-key',
        shieldedEncryptionPublicKey: 'mock-encryption-key',
      }),
      getConfiguration: vi.fn().mockResolvedValue({
        networkId: 'preprod',
        indexerUri: 'mock-indexer-uri',
        indexerWsUri: 'mock-indexer-ws-uri',
      }),
    };

    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: mockApi as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const input = screen.getByPlaceholderText('e.g. 21');
    fireEvent.change(input, { target: { value: '25' } });

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    // It should immediately update the UI state to initializing
    expect(await screen.findByText(/Initializing ZK Circuit\.\.\. Please wait\./i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('updates the input value when the user types a new age', () => {
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const input = screen.getByPlaceholderText('e.g. 21');
    fireEvent.change(input, { target: { value: '30' } });

    expect(input).toHaveValue(30);
  });

  it('disables the age input when verification is in progress', async () => {
    const mockApi = {
      getShieldedAddresses: vi.fn().mockResolvedValue({
        shieldedCoinPublicKey: 'mock-coin-key',
        shieldedEncryptionPublicKey: 'mock-encryption-key',
      }),
      getConfiguration: vi.fn().mockResolvedValue({
        networkId: 'preprod',
        indexerUri: 'mock-indexer-uri',
        indexerWsUri: 'mock-indexer-ws-uri',
      }),
    };

    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: mockApi as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const input = screen.getByPlaceholderText('e.g. 21');
    fireEvent.change(input, { target: { value: '18' } });

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    // Input should be disabled while processing
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
  });
});
