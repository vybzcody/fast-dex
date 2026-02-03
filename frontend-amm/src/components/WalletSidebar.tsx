import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, ExternalLink, Copy, ChevronDown } from 'lucide-react';

interface WalletSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  balances: Record<string, string>;
}

export const WalletSidebar = ({ isOpen, onClose, walletAddress, balances }: WalletSidebarProps) => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'pools' | 'activity'>('tokens');
  const [showBalance, setShowBalance] = useState(true);

  const tokens = Object.entries(balances).map(([symbol, amount]) => ({
    symbol,
    amount: parseFloat(amount),
    value: parseFloat(amount), // Simple 1:1 value mapping for now
    icon: symbol[0]
  }));

  const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 40
            }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            style={{
              position: 'fixed',
              top: '64px',
              right: 0,
              bottom: 0,
              width: '400px',
              maxWidth: '90vw',
              background: 'var(--cauldron-dark)',
              border: '1px solid #333',
              borderRadius: '16px 0 0 16px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px',
              borderBottom: '1px solid #333',
              position: 'sticky',
              top: 0,
              background: 'var(--cauldron-dark)',
              zIndex: 10
            }}>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '8px'
                }}>
                  <Settings size={20} />
                </button>
                <button style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '8px'
                }}>
                  <ExternalLink size={20} />
                </button>
              </div>
            </div>

            {/* Wallet Info */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                background: 'var(--cauldron-light)',
                borderRadius: '12px',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: '#667eea',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  F
                </div>
                <span style={{ fontWeight: '600', color: 'white' }}>FastDEX Wallet</span>
              </div>

              <div
                onClick={copyAddress}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                <span style={{ color: '#888', fontSize: '14px', textDecoration: 'underline' }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                </span>
                <Copy size={12} style={{ color: '#888' }} />
              </div>

              <div
                onClick={() => setShowBalance(!showBalance)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                  ${totalValue.toLocaleString()}
                </span>
                <ChevronDown size={16} style={{ color: '#888' }} />
              </div>

              <div style={{ fontSize: '14px', color: '#888' }}>
                ({tokens.length > 0 ? tokens[0].amount.toFixed(2) : '0.00'} {tokens.length > 0 ? tokens[0].symbol : ''})
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #333'
            }}>
              {[
                { key: 'tokens', label: 'Tokens' },
                { key: 'pools', label: 'Pools' },
                { key: 'activity', label: 'Activity' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    color: activeTab === key ? 'white' : '#888',
                    borderBottom: activeTab === key ? '2px solid #4caf50' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0'
            }}>
              {activeTab === 'tokens' && (
                <div>
                  {tokens.map((token, index) => (
                    <div
                      key={token.symbol}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        borderBottom: index < tokens.length - 1 ? '1px solid #333' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cauldron-light)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: index === 0 ? '#667eea' : '#764ba2',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: 'white'
                        }}>
                          {token.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'white', fontSize: '16px' }}>
                            {token.symbol}
                          </div>
                          <div style={{ fontSize: '14px', color: '#888' }}>
                            {token.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: 'white', fontSize: '16px' }}>
                          ${token.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'pools' && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>No pools found</div>
                  <div style={{ fontSize: '14px' }}>Add liquidity to earn fees</div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>No recent activity</div>
                  <div style={{ fontSize: '14px' }}>Your transactions will appear here</div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
