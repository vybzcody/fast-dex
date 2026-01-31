import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Settings, ChevronDown } from 'lucide-react';

interface SwapTabProps {
  fromToken: string;
  setFromToken: (token: string) => void;
  toToken: string;
  setToToken: (token: string) => void;
  swapAmount: string;
  setSwapAmount: (amount: string) => void;
  swapQuote: any;
  tokens: any[];
  balances: Record<string, string>;
  loading: boolean;
  onSwap: () => void;
}

export const SwapTab = ({
  fromToken, setFromToken, toToken, setToToken,
  swapAmount, setSwapAmount, swapQuote, tokens, balances, loading, onSwap
}: SwapTabProps) => {
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [showFromTokens, setShowFromTokens] = useState(false);
  const [showToTokens, setShowToTokens] = useState(false);

  const getTokenData = (symbol: string) => {
    const balance = balances[symbol] || '0';
    // Real price data would come from oracle/market feeds
    return {
      symbol,
      name: symbol,
      balance: parseFloat(balance),
      price: 0 // Placeholder for real price data
    };
  };

  const fromTokenData = getTokenData(fromToken);
  const toTokenData = getTokenData(toToken);

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    // Set the previous output as the new input amount
    if (swapQuote && swapQuote.output) {
      setSwapAmount(parseFloat(swapQuote.output).toFixed(6));
    } else {
      setSwapAmount(''); // Clear if no previous quote
    }
  };

  const handleMaxClick = () => {
    setSwapAmount(fromTokenData.balance.toString());
  };

  const handlePercentClick = (percent: number) => {
    const amount = (fromTokenData.balance * percent / 100).toFixed(6);
    setSwapAmount(amount);
  };

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #333',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Swap</h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: showSettings ? '#333' : 'transparent',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '8px',
            color: '#888',
            cursor: 'pointer'
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: '#0f0f0f',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid #333'
            }}
          >
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#888' }}>Slippage tolerance</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['0.1', '0.5', '1.0'].map(value => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: slippage === value ? '#667eea' : '#333',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {value}%
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* From Token */}
      <div style={{
        background: '#0f0f0f',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '8px',
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>From</span>
          <span style={{ fontSize: '14px', color: '#888' }}>Balance: {fromTokenData.balance.toLocaleString()}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="number"
            value={swapAmount}
            onChange={(e) => setSwapAmount(e.target.value)}
            placeholder="0.0"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '24px',
              fontWeight: '600',
              color: 'white'
            }}
          />

          <div
            onClick={() => setShowFromTokens(!showFromTokens)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#333',
              borderRadius: '20px',
              padding: '8px 12px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#667eea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {fromToken[0]}
            </div>
            <span style={{ fontWeight: '600' }}>{fromToken}</span>
            <ChevronDown size={16} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>
            ~${(parseFloat(swapAmount || '0') * fromTokenData.price).toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[25, 50, 75].map(percent => (
              <button
                key={percent}
                onClick={() => handlePercentClick(percent)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  background: '#333',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                {percent}%
              </button>
            ))}
            <button
              onClick={handleMaxClick}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                background: '#667eea',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              MAX
            </button>
          </div>
        </div>
      </div>

      {/* Token Selection Dropdown - From */}
      <AnimatePresence>
        {showFromTokens && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '200px',
              left: '24px',
              right: '24px',
              background: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '8px',
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto',
              width: 'calc(100% - 48px)'
            }}
          >
            {tokens.map(token => (
              <div
                key={token.symbol}
                onClick={() => {
                  setFromToken(token.symbol);
                  setShowFromTokens(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: fromToken === token.symbol ? '#333' : 'transparent'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {token.symbol[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{token.symbol}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{token.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px' }}>
                    {balances[token.symbol] || '0'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>${getTokenData(token.symbol).price}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swap Arrow */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <button
          onClick={swapTokens}
          style={{
            background: '#1a1a1a',
            border: '2px solid #333',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: '#888'
          }}
        >
          <ArrowDownUp size={16} />
        </button>
      </div>

      {/* To Token */}
      <div style={{
        background: '#0f0f0f',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #333'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>To</span>
          {toToken && <span style={{ fontSize: '14px', color: '#888' }}>Balance: {toTokenData.balance.toLocaleString()}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            flex: 1,
            fontSize: '24px',
            fontWeight: '600',
            color: swapQuote ? 'white' : '#666'
          }}>
            {swapQuote ? parseFloat(swapQuote.output).toFixed(6) : '0.0'}
          </div>

          <div
            onClick={() => setShowToTokens(!showToTokens)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: toToken ? '#333' : '#222',
              borderRadius: '20px',
              padding: '8px 12px',
              cursor: 'pointer',
              border: toToken ? 'none' : '1px dashed #444'
            }}
          >
            {toToken ? (
              <>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#764ba2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {toToken[0]}
                </div>
                <span style={{ fontWeight: '600' }}>{toToken}</span>
              </>
            ) : (
              <span style={{ color: '#888' }}>Select token</span>
            )}
            <ChevronDown size={16} />
          </div>
        </div>

        <div style={{ textAlign: 'right', marginTop: '8px' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>
            ~${(parseFloat(swapQuote?.output || '0') * (toTokenData?.price || 0)).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Token Selection Dropdown - To */}
      <AnimatePresence>
        {showToTokens && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              bottom: '100px',
              left: '24px',
              right: '24px',
              background: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '8px',
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto',
              width: 'calc(100% - 48px)'
            }}
          >
            {tokens.filter(t => t.symbol !== fromToken).map(token => (
              <div
                key={token.symbol}
                onClick={() => {
                  setToToken(token.symbol);
                  setShowToTokens(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: toToken === token.symbol ? '#333' : 'transparent'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#764ba2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {token.symbol[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>{token.symbol}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{token.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px' }}>
                    {balances[token.symbol] || '0'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>${getTokenData(token.symbol).price}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price Info */}
      {swapQuote && toToken && (
        <div style={{
          background: '#0f0f0f',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          border: '1px solid #333'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#888' }}>Price</span>
            <span>1 {fromToken} = {(parseFloat(swapQuote.output) / parseFloat(swapAmount)).toFixed(6)} {toToken}</span>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={onSwap}
        disabled={loading || !swapAmount || !toToken}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: loading || !swapAmount || !toToken
            ? '#333'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: loading || !swapAmount || !toToken ? '#666' : 'white',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading || !swapAmount || !toToken ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {loading ? 'Swapping...' : !swapAmount ? 'Enter an amount' : !toToken ? 'Select a token' : 'Swap'}
      </button>

      {/* Click outside to close dropdowns */}
      {(showFromTokens || showToTokens) && (
        <div
          onClick={() => {
            setShowFromTokens(false);
            setShowToTokens(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5
          }}
        />
      )}
    </div>
  );
};
