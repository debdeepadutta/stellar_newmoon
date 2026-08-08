import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress known unnecessary wallet provider errors from triggering the dev overlay
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && String(event.reason).includes('Failed to connect to MetaMask')) {
    event.preventDefault(); // Prevents the error overlay
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
