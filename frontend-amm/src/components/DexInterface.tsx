import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Wallet, Droplets, Zap, TrendingUp, Activity } from 'lucide-react';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { SwapTab } from './SwapTab';
import { PoolsTab } from './PoolsTab';
import { TokensTab } from './TokensTab';
import { LineraAdapter } from '../linera-adapter';
import { usePersistentBalances } from '../hooks/usePersistentBalances';

interface TokenId {
  chain: string;
  address: string;
  symbol: string;
}

interface MicroPool {
  tokenA: { symbol: string };
  tokenB: { symbol: string };
  reserveA: string;
  reserveB: string;
}

interface TradingToken {
  id: string;
  symbol: string;
  name: string;
  totalSupply: number;
  creator: string;
}

export const DexInterface = () => {
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { balances: persistentBalances, loading: balancesLoading, refreshBalances, addBalance } = usePersistentBalances();

  const [activeTab, setActiveTab] = useState<'swap' | 'pools' | 'tokens'>('swap');
  const [pools, setPools] = useState<MicroPool[]>([]);
  const [tokens, setTokens] = useState<TradingToken[]>([]);
  const [userPools, setUserPools] = useState<MicroPool[]>([]);
  const [loading, setLoading] = useState(false);

  // Swap state
  const [fromToken, setFromToken] = useState('LINERA');
  const [toToken, setToToken] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<any>(null);

  const adapter = LineraAdapter.getInstance();

  useEffect(() => {
    adapter.initialize();
    if (isLoggedIn) {
      loadData();
      refreshBalances(); // Also refresh balances when user logs in
    }
  }, [isLoggedIn, primaryWallet?.address]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await adapter.getPools();
      setPools(result.pools || []);
      
      setTokens([
        { id: 'ETH', symbol: 'ETH', name: 'Ethereum', totalSupply: 120000000, creator: 'ethereum' },
        { id: 'USDC', symbol: 'USDC', name: 'USD Coin', totalSupply: 50000000000, creator: 'centre' },
        { id: 'GAME', symbol: 'GAME', name: 'Game Token', totalSupply: 1000000, creator: 'user1' },
        { id: 'STABLE', symbol: 'STABLE', name: 'Stable Coin', totalSupply: 500000, creator: 'user2' }
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      setPools([]);
    } finally {
      setLoading(false);
    }
  };

  const getSwapQuote = async () => {
    if (!swapAmount || !toToken) return;
    
    const inputAmount = parseFloat(swapAmount);
    const rate = 0.95;
    const output = inputAmount * rate;
    const fee = inputAmount * 0.003;
    
    setSwapQuote({
      input: inputAmount,
      output: output.toFixed(6),
      fee: fee.toFixed(6),
      poolId: 1
    });
  };

  useEffect(() => {
    if (swapAmount && toToken && fromToken) {
      const timer = setTimeout(getSwapQuote, 500);
      return () => clearTimeout(timer);
    } else {
      setSwapQuote(null);
    }
  }, [swapAmount, toToken, fromToken]);

  const handleSwap = async () => {
    if (!swapAmount || !toToken) return;

    setLoading(true);
    try {
      // Execute the swap
      const result = await adapter.swapTokens(fromToken, toToken, swapAmount);

      // Update balances after successful swap
      // Deduct fromToken amount and add toToken amount
      const fromAmount = parseFloat(swapAmount);
      const toAmount = parseFloat(swapQuote?.output || '0');

      // In a real scenario, we'd update the balances more precisely
      // For now, let's trigger a refresh to get the latest balances from blockchain
      await refreshBalances();

      await loadData();
      setSwapAmount('');
      setSwapQuote(null);
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async (tokenA: string, tokenB: string, amountA: string, amountB: string) => {
    setLoading(true);
    try {
      await adapter.addLiquidity(tokenA, tokenB, amountA, amountB);
      await refreshBalances(); // Refresh balances after liquidity operation
      await loadData();
    } catch (error) {
      console.error('Add liquidity failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="cauldron-card max-w-md mx-auto text-center"
        >
          <Wallet size={48} className="mx-auto mb-4" style={{ color: 'var(--cauldron-button-inner)' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Connect Wallet</h2>
          <p className="text-cauldron-gray mb-6">
            Connect your wallet to start trading on FastDEX
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Compact Header */}
      <div className="text-center mb-6">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>FastDEX</h1>
        <p className="text-cauldron-gray">Lightning-fast decentralized trading on Linera</p>
      </div>

      {/* Compact Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem', 
        marginBottom: '2rem',
        maxWidth: '600px',
        margin: '0 auto 2rem auto'
      }}>
        {[
          { label: 'TVL', value: '$2.1M' },
          { label: '24h Volume', value: '$250K' },
          { label: 'Active Pools', value: pools.length.toString() },
          { label: 'Users', value: '1.2K' }
        ].map(({ label, value }) => (
          <div key={label} className="cauldron-card-dark text-center" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--cauldron-light-gray)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Compact Tab Navigation */}
      <div className="cauldron-card mb-6 p-1" style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { key: 'swap', label: 'Swap', icon: ArrowDownUp },
            { key: 'pools', label: 'Pools', icon: Droplets },
            { key: 'tokens', label: 'Tokens', icon: Zap }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === key ? 'var(--cauldron-button-inner)' : 'transparent',
                color: activeTab === key ? 'white' : 'var(--cauldron-light-gray)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'swap' && (
          <SwapTab
            fromToken={fromToken}
            setFromToken={setFromToken}
            toToken={toToken}
            setToToken={setToToken}
            swapAmount={swapAmount}
            setSwapAmount={setSwapAmount}
            swapQuote={swapQuote}
            tokens={tokens}
            balances={persistentBalances}
            loading={loading || balancesLoading}
            onSwap={handleSwap}
          />
        )}

        {activeTab === 'pools' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <PoolsTab 
              userPools={userPools}
              tokens={tokens}
              loading={loading}
              onAddLiquidity={handleAddLiquidity}
            />
          </div>
        )}

        {activeTab === 'tokens' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <TokensTab 
              tokens={tokens}
              loading={loading}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};
