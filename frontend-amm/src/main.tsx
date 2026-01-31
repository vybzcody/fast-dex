import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import './index.css'
import App from './App.tsx'

const environmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || 'live_default';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <App />
    </DynamicContextProvider>
  </StrictMode>,
)
