import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SolanaProvider } from './components/SolanaProvider.tsx';
import { PulseErrorBoundary } from './components/PulseErrorBoundary.tsx';
import { Buffer } from 'buffer';

// Polyfill Buffer for libraries that expect it (like Solana)
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PulseErrorBoundary>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </PulseErrorBoundary>
  </StrictMode>,
);
