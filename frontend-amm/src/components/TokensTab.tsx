import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, TrendingUp, DollarSign, Users, ExternalLink, Copy, Check } from 'lucide-react';

interface Token {
  id: string;
  symbol: string;
  name: string;
  totalSupply: number;
  creator: string;
  price?: number;
  change24h?: number;
  volume24h?: number;
  holders?: number;
}

interface TokensTabProps {
  tokens: Token[];
}

export const TokensTab = ({ tokens }: TokensTabProps) => {
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [newTokenSymbol, setNewTokenSymbol] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenSupply, setNewTokenSupply] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Use tokens as provided without adding mock data
  const enhancedTokens = tokens.map(token => ({
    ...token,
    address: token.id, // Use the token ID as address for now
    price: 0, // Real price would come from oracle/market data
    change24h: 0,
    volume24h: 0,
    holders: 0
  }));

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleCreateToken = () => {
    // Mock token creation
    console.log('Creating token:', { newTokenSymbol, newTokenName, newTokenSupply });
    setShowCreateToken(false);
    setNewTokenSymbol('');
    setNewTokenName('');
    setNewTokenSupply('');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={24} style={{ color: '#667eea' }} />
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Token Management</h3>
        </div>
        
        <motion.button
          onClick={() => setShowCreateToken(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
          }}
        >
          <Plus size={18} />
          Create Token
        </motion.button>
      </div>

      {/* Token Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {[
          { 
            label: 'Total Tokens', 
            value: enhancedTokens.length.toString(), 
            icon: Zap, 
            color: '#667eea',
            change: '+12%'
          },
          { 
            label: 'Total Market Cap', 
            value: '$' + (enhancedTokens.reduce((sum, token) => sum + (token.price || 0) * token.totalSupply, 0) / 1000000).toFixed(1) + 'M', 
            icon: DollarSign, 
            color: '#4caf50',
            change: '+8.5%'
          },
          { 
            label: '24h Volume', 
            value: '$' + (enhancedTokens.reduce((sum, token) => sum + (token.volume24h || 0), 0) / 1000).toFixed(0) + 'K', 
            icon: TrendingUp, 
            color: '#2196f3',
            change: '+15.2%'
          },
          { 
            label: 'Total Holders', 
            value: enhancedTokens.reduce((sum, token) => sum + (token.holders || 0), 0).toLocaleString(), 
            icon: Users, 
            color: '#ff9800',
            change: '+5.7%'
          }
        ].map(({ label, value, icon: Icon, color, change }) => (
          <motion.div
            key={label}
            whileHover={{ scale: 1.02 }}
            style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid #333',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.5rem',
              background: `${color}20`,
              borderRadius: '8px'
            }}>
              <Icon size={20} style={{ color }} />
            </div>
            
            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>
              {value}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: change.startsWith('+') ? '#4caf50' : '#f44336',
              fontWeight: '600'
            }}>
              {change} 24h
            </div>
          </motion.div>
        ))}
      </div>

      {/* Token List */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', 
        borderRadius: '20px', 
        border: '1px solid #333',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', 
          gap: '1rem', 
          padding: '1.5rem',
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid #333',
          fontSize: '0.9rem',
          fontWeight: '600',
          color: '#888'
        }}>
          <div>Token</div>
          <div>Price</div>
          <div>24h Change</div>
          <div>Volume (24h)</div>
          <div>Holders</div>
          <div>Actions</div>
        </div>

        {/* Token Rows */}
        {enhancedTokens.map((token, index) => (
          <motion.div
            key={token.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', 
              gap: '1rem', 
              padding: '1.5rem',
              borderBottom: index < enhancedTokens.length - 1 ? '1px solid #333' : 'none',
              cursor: 'pointer'
            }}
            whileHover={{ background: 'rgba(102, 126, 234, 0.05)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${token.symbol.charCodeAt(0) % 2 ? '#667eea' : '#764ba2'} 0%, ${token.symbol.charCodeAt(0) % 2 ? '#764ba2' : '#667eea'} 100%)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {token.symbol[0]}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>
                  {token.symbol}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                  {token.name}
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginTop: '0.25rem'
                }}>
                  {token.address?.slice(0, 6)}...{token.address?.slice(-4)}
                  <button
                    onClick={() => copyToClipboard(token.address!)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      padding: '0.125rem'
                    }}
                  >
                    {copiedAddress === token.address ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ color: 'white', fontWeight: '600' }}>
              ${token.price?.toFixed(4)}
            </div>
            
            <div style={{ 
              color: (token.change24h || 0) >= 0 ? '#4caf50' : '#f44336',
              fontWeight: '600'
            }}>
              {(token.change24h || 0) >= 0 ? '+' : ''}{token.change24h?.toFixed(2)}%
            </div>
            
            <div style={{ color: 'white' }}>
              ${token.volume24h?.toLocaleString()}
            </div>
            
            <div style={{ color: 'white' }}>
              {token.holders?.toLocaleString()}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{
                padding: '0.5rem 1rem',
                background: 'rgba(102, 126, 234, 0.2)',
                border: '1px solid #667eea',
                borderRadius: '8px',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                Trade
              </button>
              <button 
                onClick={() => window.open(`https://etherscan.io/token/${token.address}`, '_blank')}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Token Modal */}
      <AnimatePresence>
        {showCreateToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowCreateToken(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                padding: '2rem',
                borderRadius: '20px',
                border: '1px solid #333',
                width: '90%',
                maxWidth: '500px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <Zap size={24} style={{ color: '#667eea' }} />
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Create New Token</h3>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Token Symbol</label>
                <input
                  type="text"
                  value={newTokenSymbol}
                  onChange={(e) => setNewTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. GAME"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Token Name</label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g. Game Token"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Initial Supply</label>
                <input
                  type="number"
                  value={newTokenSupply}
                  onChange={(e) => setNewTokenSupply(e.target.value)}
                  placeholder="1000000"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ 
                background: 'rgba(102, 126, 234, 0.1)', 
                padding: '1rem', 
                borderRadius: '12px', 
                marginBottom: '2rem',
                border: '1px solid rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>
                  Token Creation Fee: 10 LINERA
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  This fee helps prevent spam and supports the network
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setShowCreateToken(false)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: '#888',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateToken}
                  disabled={!newTokenSymbol || !newTokenName || !newTokenSupply}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: (!newTokenSymbol || !newTokenName || !newTokenSupply) 
                      ? 'rgba(102, 126, 234, 0.3)' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: (!newTokenSymbol || !newTokenName || !newTokenSupply) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Create Token
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
