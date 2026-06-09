import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPulseMarketsFromStorage, prefetchPulseNewsBundle } from './lib/pulseNewsPrefetch';

initPulseMarketsFromStorage();
void prefetchPulseNewsBundle();
import { SolanaProvider } from './components/SolanaProvider.tsx';
import { PhantomConnectProvider } from './components/PhantomConnectProvider.tsx';
import { PulseErrorBoundary } from './components/PulseErrorBoundary.tsx';
import { Buffer } from 'buffer';

// Polyfill Buffer for libraries that expect it (like Solana)
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PulseErrorBoundary>
      <PhantomConnectProvider>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </PhantomConnectProvider>
    </PulseErrorBoundary>
  </StrictMode>,
);

document.getElementById('blocks-boot')?.remove();
