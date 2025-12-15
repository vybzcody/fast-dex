import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRealTokens } from './hooks/useRealTokens';
import { CHAIN_CONFIG } from './config/tokens';

export const TestingInterface = () => {
  const { 
    balances, 
    generatedWallets, 
    loading, 
    currentChain,
    supportedChains,
    generateWalletForChain,
    fetchTokenBalances,
    swapTokens 
  } = useRealTokens();
  
  const [selectedChain, setSelectedChain] = useState(137); // Polygon
  const [swapAmount, setSwapAmount] = useState('');

  const handleGenerateWallet = async () => {
    const wallet = await generateWalletForChain(selectedChain);
    if (wallet) {
      await fetchTokenBalances(selectedChain, wallet.address);
    }
  };

  const handleSwap = async () => {
    if (!swapAmount) return;
    await swapTokens('USDC', 'USDT', swapAmount, selectedChain);
    setSwapAmount('');
  };

  const selectedChainConfig = CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG];
  const currentChainConfig = currentChain ? CHAIN_CONFIG[currentChain as keyof typeof CHAIN_CONFIG] : null;

  return (
    <motion.div 
      className="testing-interface"
      style={{ 
        padding: '2rem', 
        background: '#1a1a1a', 
        borderRadius: '12px', 
        margin: '2rem',
        color: 'white'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>🚀 Real Token DEX</h2>
      
      {/* Current Chain Status */}
      <div style={{ 
        marginBottom: '2rem', 
        padding: '1rem', 
        background: '#2a2a2a', 
        borderRadius: '8px' 
      }}>
        <h3>📡 Connected: {currentChainConfig?.name || 'Not Connected'}</h3>
        {currentChain && (
          <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Chain ID: {currentChain} | Explorer: {currentChainConfig?.blockExplorer}
          </p>
        )}
      </div>

      {/* Chain Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label>Select Chain for DEX Wallet: </label>
        <select 
          value={selectedChain} 
          onChange={(e) => setSelectedChain(Number(e.target.value))}
          style={{ 
            padding: '0.5rem', 
            borderRadius: '8px', 
            background: '#2a2a2a', 
            color: 'white', 
            border: '1px solid #444',
            marginLeft: '0.5rem'
          }}
        >
          {supportedChains.map(chainId => {
            const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
            return (
              <option key={chainId} value={chainId}>
                {config.name} ({chainId})
              </option>
            );
          })}
        </select>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button 
          onClick={handleGenerateWallet} 
          disabled={loading}
          style={{
            padding: '0.75rem 1rem',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Generate DEX Wallet & Fetch Balances
        </button>
      </div>

      {/* Generated Wallets */}
      {generatedWallets.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>🔑 Generated DEX Wallets:</h3>
          {generatedWallets.map(wallet => {
            const config = CHAIN_CONFIG[wallet.chainId as keyof typeof CHAIN_CONFIG];
            return (
              <div key={wallet.chainId} style={{ 
                fontSize: '0.9rem', 
                fontFamily: 'monospace', 
                background: '#2a2a2a',
                padding: '0.5rem',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                <strong>{config.name}:</strong> {wallet.address}
                <br />
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  Private Key: {wallet.privateKey.slice(0, 20)}...
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Real Token Balances */}
      {Object.keys(balances).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>💰 Real Token Balances:</h3>
          {Object.entries(balances).map(([chainId, tokens]) => {
            const config = CHAIN_CONFIG[Number(chainId) as keyof typeof CHAIN_CONFIG];
            return (
              <div key={chainId} style={{ marginBottom: '1rem' }}>
                <h4>{config.name}:</h4>
                {tokens.map(token => (
                  <div key={token.symbol} style={{ 
                    fontSize: '1rem',
                    padding: '0.5rem',
                    background: '#2a2a2a',
                    borderRadius: '4px',
                    marginBottom: '0.5rem'
                  }}>
                    {parseFloat(token.balance).toFixed(6)} {token.symbol}
                    <br />
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {token.address}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Swap Interface */}
      {balances[selectedChain] && (
        <div>
          <h3>🔄 Real Token Swap (USDC → USDT):</h3>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
            Fee Structure: 0.3% to LP providers + 0.05% protocol fee
          </p>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Amount to swap"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: '#2a2a2a',
                color: 'white',
                border: '1px solid #444'
              }}
            />
            <button 
              onClick={handleSwap}
              disabled={!swapAmount || loading}
              style={{
                padding: '0.75rem 1rem',
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Swapping...' : 'Swap'}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#2a2a2a', 
        borderRadius: '8px',
        fontSize: '0.9rem',
        opacity: 0.8
      }}>
        <h4>📋 Real Token DEX:</h4>
        <ol>
          <li>Connect wallet and switch to supported L2</li>
          <li>Generate DEX wallet for selected chain</li>
          <li>View real token balances from blockchain</li>
          <li>Swap tokens with real CFMM pricing</li>
          <li>Fees: 0.3% to LPs + 0.05% to protocol treasury</li>
        </ol>
      </div>
    </motion.div>
  );
};
