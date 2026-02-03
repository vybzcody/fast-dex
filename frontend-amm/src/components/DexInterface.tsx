import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Wallet, Droplets } from 'lucide-react';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { SwapTab } from './SwapTab';
import { PoolsTab } from './PoolsTab';
import { LineraClientAdapter } from '../linera-client';
import { useBlockchainBalances } from '../hooks/useBlockchainBalances';

import { Token, Pool } from '../linera-client';

interface TradingToken {
  symbol: string;
  name: string;
  network: string;
  totalSupply: number;
}

interface DexInterfaceProps {
  balances: Record<string, string>;
  refreshBalances: () => Promise<void>;
}

export const DexInterface = ({ balances, refreshBalances }: DexInterfaceProps) => {
  const { primaryWallet } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const balancesLoading = false; // Managed at App level or pass loading as prop if needed

  const [activeTab, setActiveTab] = useState<'swap' | 'pools'>('swap');
  const [pools, setPools] = useState<Pool[]>([]);
  const [tokens, setTokens] = useState<TradingToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Swap state
  const [fromToken, setFromToken] = useState('USDC');
  const [toToken, setToToken] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<any>(null);

  const adapter = LineraClientAdapter.getInstance();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadAdapterConfig = async () => {
      try {
        await adapter.loadConfig();
        console.log('Adapter config loaded');

        // Check if already initialized (e.g. from FaucetTab)
        if (adapter.isInitialized && primaryWallet) {
          setIsReady(true);
          // We can't call loadData here directly easily because it's defined below
          // instead we'll interpret isReady change to trigger load
        }
      } catch (error) {
        console.error('Failed to load adapter config:', error);
        setError('Failed to load Linera adapter config');
      }
    };

    loadAdapterConfig();
  }, [primaryWallet]);

  // Trigger loadData when isReady becomes true
  useEffect(() => {
    if (isReady && primaryWallet) {
      loadData();
    }
  }, [isReady, primaryWallet]);

  const handleInitialize = async () => {
    if (!primaryWallet) {
      setError('Please connect your Dynamic wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await adapter.initialize(primaryWallet);
      setIsReady(true);
      await loadData();
      console.log('✅ FastDEX initialized and ready');
    } catch (error) {
      console.error('Failed to initialize FastDEX:', error);
      setError('Failed to initialize FastDEX: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load real pools from blockchain
      const poolsResult = await adapter.getPools();
      setPools(poolsResult || []);

      // Load faucet tokens as available tokens
      const faucetTokens = await adapter.getFaucetTokens();
      const tokenList = faucetTokens.map((token: Token) => ({
        symbol: token.symbol,
        name: token.name || token.symbol,
        network: token.network,
        totalSupply: 1000000,
      }));
      setTokens(tokenList);

      // Set default tokens if available
      if (faucetTokens.length > 0 && !fromToken) {
        setFromToken(faucetTokens[0].symbol);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load DEX data');
      setPools([]);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const getSwapQuote = async () => {
    if (!swapAmount || !toToken || !fromToken) return;

    try {
      const fromTokenObj = tokens.find(t => t.symbol === fromToken);
      const toTokenObj = tokens.find(t => t.symbol === toToken);

      if (!fromTokenObj || !toTokenObj) return;

      // Use real estimate swap from blockchain
      const estimate = await adapter.estimateSwap(
        fromToken,
        toToken,
        swapAmount
      );

      if (estimate) {
        setSwapQuote({
          input: parseFloat(swapAmount),
          output: estimate,
          fee: (parseFloat(swapAmount) * 0.003).toFixed(6), // 0.3% fee
          poolId: 1
        });
      }
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      setSwapQuote(null);
    }
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
    if (!swapAmount || !toToken || !fromToken) return;

    setLoading(true);
    try {
      await adapter.swapTokens(fromToken, toToken, swapAmount);

      // Refresh balances after successful swap
      await refreshBalances();
      await loadData();

      setSwapAmount('');
      setSwapQuote(null);
    } catch (error) {
      console.error('Swap failed:', error);
      setError('Swap failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async (tokenA: string, tokenB: string, amountA: string, amountB: string) => {
    setLoading(true);
    try {
      await adapter.addLiquidity(tokenA, tokenB, amountA, amountB);
      await refreshBalances();
      await loadData();
    } catch (error) {
      console.error('Add liquidity failed:', error);
      setError('Add liquidity failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async (tokenA: string, tokenB: string, amountA: string, amountB: string, feeRate: number) => {
    setLoading(true);
    try {
      await adapter.createPool(tokenA, tokenB, amountA, amountB, feeRate);
      await refreshBalances();
      await loadData();
    } catch (error) {
      console.error('Create pool failed:', error);
      setError('Create pool failed: ' + (error as Error).message);
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
      {/* Header */}
      <div className="text-center mb-6">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>FastDEX</h1>
        <p className="text-cauldron-gray">Lightning-fast decentralized trading on Linera</p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(244, 67, 54, 0.15)',
          border: '1px solid rgba(244, 67, 54, 0.3)',
          color: '#f44336',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto 1.5rem auto'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: '1rem', color: '#f44336', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        marginBottom: '2rem',
        maxWidth: '600px',
        margin: '0 auto 2rem auto'
      }}>
        {[
          { label: 'Active Pools', value: pools.length.toString() },
          { label: 'Available Tokens', value: tokens.length.toString() },
          { label: 'Your Balances', value: Object.keys(balances).length.toString() },
          { label: 'Network', value: 'Local' }
        ].map(({ label, value }) => (
          <div key={label} className="cauldron-card-dark text-center" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--cauldron-light-gray)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Connection Status */}
      {!isReady && (
        <div style={{
          maxWidth: '400px',
          margin: '0 auto 2rem auto',
          textAlign: 'center'
        }}>
          <div className="cauldron-card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Connect to FastDEX</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--cauldron-light-gray)' }}>
              Initialize your connection to start trading on Linera
            </p>
            <button
              className="cauldron-button"
              onClick={handleInitialize}
              disabled={!isLoggedIn || !primaryWallet || loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Connecting...' : 'Connect to FastDEX'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {isReady && (
        <div className="cauldron-card mb-6 p-1" style={{ maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { key: 'swap', label: 'Swap', icon: ArrowDownUp },
              { key: 'pools', label: 'Pools', icon: Droplets }
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
                balances={balances}
                loading={loading || balancesLoading}
                onSwap={handleSwap}
              />
            )}

            {activeTab === 'pools' && (
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <PoolsTab
                  userPools={pools}
                  tokens={tokens}
                  onAddLiquidity={handleAddLiquidity}
                  onCreatePool={handleCreatePool}
                />
              </div>
            )}

          </motion.div>
        </div>
      )}
    </div>
  );
}
