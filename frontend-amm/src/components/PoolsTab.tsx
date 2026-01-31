import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Droplets, TrendingUp, DollarSign, Percent, ExternalLink, Zap } from 'lucide-react';

interface PoolsTabProps {
  userPools: any[];
  tokens: any[];
  onAddLiquidity?: (tokenA: string, tokenB: string, amountA: string, amountB: string) => void;
  onCreatePool?: (tokenA: string, tokenB: string, amountA: string, amountB: string, feeRate: number) => void;
}

export const PoolsTab = ({ userPools, tokens, onAddLiquidity, onCreatePool: _onCreatePool }: PoolsTabProps) => {
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [selectedTokenA, setSelectedTokenA] = useState('');
  const [selectedTokenB, setSelectedTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // Use real pools data instead of mock data
  const allPools = userPools.map((pool, index) => ({
    id: index + 1,
    tokenA: pool.tokenA,
    tokenB: pool.tokenB,
    reserveA: pool.reserveA,
    reserveB: pool.reserveB,
    totalLiquidity: parseFloat(pool.reserveA) + parseFloat(pool.reserveB), // Simple calculation
    volume24h: 0, // Would come from analytics in real implementation
    fees24h: 0,
    apr: 0
  }));

  const tokenList = tokens.map(token => token.symbol);

  const handleCreatePool = () => {
    if (onAddLiquidity && selectedTokenA && selectedTokenB && amountA && amountB) {
      onAddLiquidity(selectedTokenA, selectedTokenB, amountA, amountB);
      setShowCreatePool(false);
      setSelectedTokenA('');
      setSelectedTokenB('');
      setAmountA('');
      setAmountB('');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Droplets size={24} style={{ color: '#667eea' }} />
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Liquidity Pools</h3>
        </div>

        <motion.button
          onClick={() => setShowCreatePool(true)}
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
          Create Pool
        </motion.button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        background: '#1a1a1a',
        padding: '0.5rem',
        borderRadius: '12px',
        border: '1px solid #333'
      }}>
        {[
          { key: 'all', label: 'All Pools', count: allPools.length },
          { key: 'my', label: 'My Pools', count: userPools.length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: activeTab === key ? '#667eea' : 'transparent',
              color: activeTab === key ? 'white' : '#888',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {label}
            <span style={{
              padding: '0.25rem 0.5rem',
              background: activeTab === key ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              fontSize: '0.8rem'
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Pool Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {[
          { label: 'Total Value Locked', value: '$2.1M', icon: DollarSign, color: '#4caf50' },
          { label: '24h Volume', value: '$250K', icon: TrendingUp, color: '#2196f3' },
          { label: '24h Fees', value: '$750', icon: Percent, color: '#ff9800' },
          { label: 'Active Pools', value: allPools.length.toString(), icon: Droplets, color: '#9c27b0' }
        ].map(({ label, value, icon: Icon, color }) => (
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
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{value}</div>
          </motion.div>
        ))}
      </div>

      {/* Pool List */}
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
          <div>Pool</div>
          <div>TVL</div>
          <div>Volume (24h)</div>
          <div>Fees (24h)</div>
          <div>APR</div>
          <div>Action</div>
        </div>

        {/* Pool Rows */}
        {(activeTab === 'all' ? allPools : userPools).map((pool, index) => (
          <motion.div
            key={pool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
              gap: '1rem',
              padding: '1.5rem',
              borderBottom: index < allPools.length - 1 ? '1px solid #333' : 'none',
              cursor: 'pointer'
            }}
            whileHover={{ background: 'rgba(102, 126, 234, 0.05)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  marginRight: '-8px',
                  zIndex: 2
                }}>
                  {pool.tokenA.symbol[0]}
                </div>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {pool.tokenB.symbol[0]}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: 'white' }}>
                  {pool.tokenA.symbol}/{pool.tokenB.symbol}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                  {parseFloat(pool.reserveA).toLocaleString()} / {parseFloat(pool.reserveB).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ color: 'white', fontWeight: '600' }}>
              ${pool.totalLiquidity.toLocaleString()}
            </div>

            <div style={{ color: 'white' }}>
              ${pool.volume24h.toLocaleString()}
            </div>

            <div style={{ color: '#4caf50', fontWeight: '600' }}>
              ${pool.fees24h.toLocaleString()}
            </div>

            <div style={{
              color: pool.apr > 10 ? '#4caf50' : pool.apr > 5 ? '#ffa726' : '#888',
              fontWeight: '600'
            }}>
              {pool.apr}%
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
                Add
              </button>
              <button style={{
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid #444',
                borderRadius: '8px',
                color: '#888',
                cursor: 'pointer'
              }}>
                <ExternalLink size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Pool Modal */}
      <AnimatePresence>
        {showCreatePool && (
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
            onClick={() => setShowCreatePool(false)}
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
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Create New Pool</h3>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Token A</label>
                <select
                  value={selectedTokenA}
                  onChange={(e) => setSelectedTokenA(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Token A</option>
                  {tokenList.map(token => (
                    <option key={token} value={token} style={{ background: '#1a1a1a' }}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Amount A</label>
                <input
                  type="number"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
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
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Token B</label>
                <select
                  value={selectedTokenB}
                  onChange={(e) => setSelectedTokenB(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Select Token B</option>
                  {tokenList.filter(token => token !== selectedTokenA).map(token => (
                    <option key={token} value={token} style={{ background: '#1a1a1a' }}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888' }}>Amount B</label>
                <input
                  type="number"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
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

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setShowCreatePool(false)}
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
                  onClick={handleCreatePool}
                  disabled={!selectedTokenA || !selectedTokenB || !amountA || !amountB}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: (!selectedTokenA || !selectedTokenB || !amountA || !amountB)
                      ? 'rgba(102, 126, 234, 0.3)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: (!selectedTokenA || !selectedTokenB || !amountA || !amountB) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Create Pool
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
