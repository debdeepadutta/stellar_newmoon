
import { WalletProvider } from './context/WalletContext';
import { WalletConnect } from './components/WalletConnect';
import { OneClickVerify } from './components/OneClickVerify';
import './index.css';

function App() {
  return (
    <WalletProvider>
      <div className="app-container">
        <header className="app-header">
          <div className="logo-container">
            <div className="logo-circle"></div>
            <h1>Midnight Deployer</h1>
          </div>
          <p className="subtitle">Deploy Compact smart contracts seamlessly from your browser.</p>
        </header>
        
        <main className="app-main">
          <div className="dashboard-grid">
            <WalletConnect />
            <OneClickVerify />
          </div>
        </main>

        <footer className="app-footer">
          <p>Built with Midnight SDK & React</p>
        </footer>
      </div>
    </WalletProvider>
  );
}

export default App;
