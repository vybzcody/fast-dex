import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Coins, RotateCcw, Wallet } from 'lucide-react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { LineraAdapter } from '../linera-adapter';
import { usePersistentBalances } from '../hooks/usePersistentBalances';

interface TokenId {
  chain: string;
  address: string;
  symbol: string;
}

interface FaucetToken {
  chain: string;
  address: string;
  symbol: string;
}

export const FaucetTab = () => {
  const [tokens, setTokens] = useState<TokenId[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenId | null>(null);
  const [claimAmount, setClaimAmount] = useState<string>('100');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);

  const { primaryWallet } = useDynamicContext();
  const { addBalance, refreshBalances } = usePersistentBalances();
  const COOLDOWN_PERIOD = 60; // 1 minute cooldown

  // Fetch available faucet tokens
  useEffect(() => {
    const fetchFaucetTokens = async () => {
      try {
        setIsLoading(true);
        const adapter = LineraAdapter.getInstance();
        // Fetch faucet tokens from the dex service
        // For now, using pre-configured mock tokens
        const mockTokens: TokenId[] = [
          {
            chain: 'ethereum',
            address: 'mock_usdc',
            symbol: 'MOCK_USDC'
          },
          {
            chain: 'polygon',
            address: 'mock_eth',
            symbol: 'MOCK_ETH'
          },
          {
            chain: 'base',
            address: 'mock_btc',
            symbol: 'MOCK_BTC'
          }
        ];

        setTokens(mockTokens);
        if (mockTokens.length > 0) {
          setSelectedToken(mockTokens[0]);
        }
      } catch (error) {
        console.error('Error fetching faucet tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFaucetTokens();
  }, []);

  // Handle cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (lastClaimTime) {
      const timePassed = Math.floor((Date.now() - lastClaimTime) / 1000);
      const timeLeft = Math.max(0, COOLDOWN_PERIOD - timePassed);
      setCooldownTimeLeft(timeLeft);
      
      if (timeLeft > 0) {
        timer = setTimeout(() => {
          setCooldownTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
      }
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lastClaimTime]);

  const handleClaim = async () => {
    if (!primaryWallet || !selectedToken) return;
    
    // Check cooldown
    if (lastClaimTime && (Date.now() - lastClaimTime) / 1000 < COOLDOWN_PERIOD) {
      alert('Please wait for the cooldown period to finish');
      return;
    }

    try {
      setIsClaiming(true);
      const amount = parseFloat(claimAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      // Call the Linera contract to claim faucet tokens
      const adapter = LineraAdapter.getInstance();
      await adapter.claimFaucetTokens(selectedToken.symbol, claimAmount.toString());

      // Update local balance
      addBalance(selectedToken.symbol, amount);

      setLastClaimTime(Date.now());
      setClaimedAmount(amount);

      // Reset after showing success
      setTimeout(() => {
        setClaimedAmount(null);
      }, 3000);

    } catch (error) {
      console.error('Error claiming tokens:', error);
      alert('Failed to claim tokens: ' + (error as Error).message);
    } finally {
      setIsClaiming(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="cauldron-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '2rem' }}
      >
        <Droplets size={64} style={{ margin: '0 auto 1rem', color: '#4caf50' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Token Faucet</h2>
        <p style={{ color: 'var(--cauldron-light-gray)', marginBottom: '1.5rem' }}>
          Claim test tokens for trading on FastDEX
        </p>
      </motion.div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" />
          <div style={{ marginTop: '1rem', color: 'var(--cauldron-light-gray)' }}>Loading tokens...</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--cauldron-light-gray)' }}>
              Select Token
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem'
            }}>
              {tokens.map((token, index) => (
                <button
                  key={`${token.chain}-${token.address}`}
                  onClick={() => setSelectedToken(token)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: selectedToken?.address === token.address 
                      ? '2px solid var(--cauldron-button-inner)' 
                      : '1px solid #333',
                    background: selectedToken?.address === token.address 
                      ? 'rgba(102, 126, 234, 0.15)' 
                      : 'rgba(51, 51, 51, 0.5)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--cauldron-light-gray)' }}>
              Claim Amount
            </label>
            <input
              type="number"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid #333',
                background: 'rgba(51, 51, 51, 0.5)',
                color: 'white',
                fontSize: '1rem'
              }}
            />
          </div>

          <motion.button
            className="cauldron-button"
            disabled={isClaiming || (lastClaimTime && (Date.now() - lastClaimTime) / 1000 < COOLDOWN_PERIOD)}
            onClick={handleClaim}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: (lastClaimTime && (Date.now() - lastClaimTime) / 1000 < COOLDOWN_PERIOD) ? 0.6 : 1
            }}
          >
            {isClaiming ? (
              <>
                <div className="spinner-small" />
                Claiming...
              </>
            ) : lastClaimTime && (Date.now() - lastClaimTime) / 1000 < COOLDOWN_PERIOD ? (
              <>
                <RotateCcw size={18} />
                Wait {formatTime(cooldownTimeLeft)}
              </>
            ) : (
              <>
                <Droplets size={18} />
                Claim Tokens
              </>
            )}
          </motion.button>

          {claimedAmount && selectedToken && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(76, 175, 80, 0.15)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                textAlign: 'center'
              }}
            >
              <Coins size={24} style={{ margin: '0 auto 0.5rem', color: '#4caf50' }} />
              <div style={{ fontWeight: '600', color: '#4caf50' }}>
                Success!
              </div>
              <div style={{ color: 'var(--cauldron-light-gray)', fontSize: '0.9rem' }}>
                Claimed {claimedAmount} {selectedToken.symbol}
              </div>
            </motion.div>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <div style={{ 
              fontSize: '0.85rem', 
              color: 'var(--cauldron-light-gray)',
              marginBottom: '0.5rem'
            }}>
              <Wallet size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              {primaryWallet ? `${primaryWallet.address.slice(0, 6)}...${primaryWallet.address.slice(-4)}` : 'No wallet connected'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#ff9800' }}>
              ⚠️ Demo tokens only - not real value
            </div>
          </div>
        </>
      )}
    </div>
  );
};