import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WalletProvider, useWallet } from '../context/WalletContext';
import { WalletConnect } from '../components/WalletConnect';
import { OneClickVerify } from '../components/OneClickVerify';

// ── Helper ─────────────────────────────────────────────────────────────────────
function renderWithWallet(ui: React.ReactElement) {
  return render(<WalletProvider>{ui}</WalletProvider>);
}

// ── Test 1: WalletConnect renders the connect button ──────────────────────────
describe('WalletConnect', () => {
  it('renders Connect Wallet button when no wallet is connected', () => {
    renderWithWallet(<WalletConnect />);
    expect(
      screen.getByRole('button', { name: /connect wallet/i })
    ).toBeInTheDocument();
  });
});

// ── Test 2: OneClickVerify shows disabled state without wallet ─────────────────
describe('OneClickVerify - initial render', () => {
  it('renders button in disabled state when wallet is not connected', () => {
    renderWithWallet(<OneClickVerify />);
    expect(
      screen.getByRole('button', { name: /connect wallet first/i })
    ).toBeInTheDocument();
  });
});

// ── Test 3: Age input field is present ───────────────────────────────────────
describe('OneClickVerify - age input', () => {
  it('renders a number input field for private age entry', () => {
    renderWithWallet(<OneClickVerify />);
    const input = screen.getByPlaceholderText(/e\.g\. 21/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });
});

// ── Test 4: WalletProvider context default values ─────────────────────────────
describe('WalletContext', () => {
  it('provides null connectedApi and walletAddress by default', () => {
    let connectedApi: unknown = 'not-checked';
    let walletAddress: unknown = 'not-checked';
    let isConnecting: unknown = 'not-checked';

    function Probe() {
      const ctx = useWallet();
      connectedApi = ctx.connectedApi;
      walletAddress = ctx.walletAddress;
      isConnecting = ctx.isConnecting;
      return null;
    }

    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );

    expect(connectedApi).toBeNull();
    expect(walletAddress).toBeNull();
    expect(isConnecting).toBe(false);
  });
});

// ── Test 5: Button is disabled without wallet ─────────────────────────────────
describe('OneClickVerify - button guard', () => {
  it('disables the prove button when no wallet is connected', () => {
    renderWithWallet(<OneClickVerify />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

// ── Test 6: Heading is rendered ───────────────────────────────────────────────
describe('OneClickVerify - content', () => {
  it('renders the Age Verification heading', () => {
    renderWithWallet(<OneClickVerify />);
    expect(screen.getByText('1-Click Age Verification')).toBeInTheDocument();
  });
});
