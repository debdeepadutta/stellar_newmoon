import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OneClickVerify } from '../OneClickVerify';
import * as WalletContextModule from '../../context/WalletContext';

// Mock the WalletContext
vi.mock('../../context/WalletContext', () => ({
  useWallet: vi.fn(),
}));

const MOCK_CONTRACT_ADDRESS = 'abc123def456';

describe('OneClickVerify Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and prompts to connect wallet when not connected', () => {
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: null,
      walletAddress: null,
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    expect(screen.getByText('1-Click Age Verification')).toBeInTheDocument();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Connect Wallet First');
  });

  it('enables the verify button when wallet is connected', () => {
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    expect(button).toBeEnabled();
  });

  it('shows an error if user tries to prove without entering contract address', async () => {
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    // Click without filling in contract address
    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    expect(await screen.findByText(/Please enter the contract address first/i)).toBeInTheDocument();
  });

  it('shows an error if user enters contract address but no age', async () => {
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    // Fill in contract address but NOT age
    const contractInput = screen.getByPlaceholderText(/Paste deployed contract address/i);
    fireEvent.change(contractInput, { target: { value: MOCK_CONTRACT_ADDRESS } });

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    expect(await screen.findByText(/Please enter your age first/i)).toBeInTheDocument();
  });

  it('starts verification process when contract address and age are both entered', async () => {
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

    const contractInput = screen.getByPlaceholderText(/Paste deployed contract address/i);
    fireEvent.change(contractInput, { target: { value: MOCK_CONTRACT_ADDRESS } });

    const ageInput = screen.getByPlaceholderText('e.g. 21');
    fireEvent.change(ageInput, { target: { value: '25' } });

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    // Should show the initialising status text
    expect(await screen.findByText(/Initializing ZK Circuit\.\.\. Please wait\./i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('updates the contract address input when the user types', () => {
    vi.spyOn(WalletContextModule, 'useWallet').mockReturnValue({
      connectedApi: {} as any,
      walletAddress: 'mock-address',
      isConnecting: false,
      error: null,
    } as any);

    render(<OneClickVerify />);

    const contractInput = screen.getByPlaceholderText(/Paste deployed contract address/i);
    fireEvent.change(contractInput, { target: { value: MOCK_CONTRACT_ADDRESS } });
    expect(contractInput).toHaveValue(MOCK_CONTRACT_ADDRESS);
  });

  it('updates the age input value when the user types a new age', () => {
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

  it('disables both inputs when verification is in progress', async () => {
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

    const contractInput = screen.getByPlaceholderText(/Paste deployed contract address/i);
    fireEvent.change(contractInput, { target: { value: MOCK_CONTRACT_ADDRESS } });

    const ageInput = screen.getByPlaceholderText('e.g. 21');
    fireEvent.change(ageInput, { target: { value: '18' } });

    const button = screen.getByRole('button', { name: /Prove Age Anonymously/i });
    fireEvent.click(button);

    // Both inputs should be disabled while processing
    await waitFor(() => {
      expect(ageInput).toBeDisabled();
      expect(contractInput).toBeDisabled();
    });
  });
});
