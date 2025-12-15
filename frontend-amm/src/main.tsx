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
        overrides: {
          evmNetworks: [
            // Mainnets
            { 
              chainId: 42161, 
              name: 'Arbitrum One', 
              rpcUrls: ['https://arb1.arbitrum.io/rpc'], 
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://arbiscan.io'],
              networkId: 42161
            },
            { 
              chainId: 137, 
              name: 'Polygon', 
              rpcUrls: ['https://polygon-rpc.com'], 
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              blockExplorerUrls: ['https://polygonscan.com'],
              networkId: 137
            },
            { 
              chainId: 8453, 
              name: 'Base', 
              rpcUrls: ['https://mainnet.base.org'], 
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://basescan.org'],
              networkId: 8453
            },
            { 
              chainId: 10, 
              name: 'Optimism', 
              rpcUrls: ['https://mainnet.optimism.io'], 
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://optimistic.etherscan.io'],
              networkId: 10
            },
            
            // Testnets
            { 
              chainId: 80001, 
              name: 'Polygon Mumbai', 
              rpcUrls: ['https://rpc-mumbai.maticvigil.com'], 
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              blockExplorerUrls: ['https://mumbai.polygonscan.com'],
              networkId: 80001
            },
            { 
              chainId: 84532, 
              name: 'Base Sepolia', 
              rpcUrls: ['https://sepolia.base.org'], 
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              blockExplorerUrls: ['https://sepolia.basescan.org'],
              networkId: 84532
            },
          ],
        },
      }}
    >
      <App />
    </DynamicContextProvider>
  </StrictMode>,
)
