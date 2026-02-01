import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Wallet, ArrowDownUp, Activity, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import { DexInterface } from './components/DexInterface'
import { WalletSidebar } from './components/WalletSidebar'
import './App.css'

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<DexInterface />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  )
}

const AnalyticsPage = () => (
  <motion.div 
    style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem'
    }}
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }}
  >
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Analytics Dashboard</h2>
      <p style={{ color: 'var(--cauldron-light-gray)' }}>
        Real-time insights into FastDEX performance and market data
      </p>
    </div>
    
    <div className="grid-responsive">
      {[
        { title: 'Trading Volume', value: '$2.5M', change: '+15.2%', chart: '📈' },
        { title: 'Total Value Locked', value: '$12.8M', change: '+8.7%', chart: '💰' },
        { title: 'Active Users', value: '1,247', change: '+23.1%', chart: '👥' },
        { title: 'Transactions', value: '45,678', change: '+12.4%', chart: '⚡' }
      ].map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="cauldron-card"
        >
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{metric.chart}</div>
          <div style={{ color: 'var(--cauldron-light-gray)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {metric.title}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {metric.value}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#4caf50', fontWeight: '600' }}>
            {metric.change} 24h
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
)

const NavBar = () => {
  const location = useLocation();
  const { primaryWallet, setShowAuthFlow, sdkHasLoaded } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [showWalletSidebar, setShowWalletSidebar] = useState(false);

  if (!sdkHasLoaded) return null;

  return (
    <>
      <motion.header
        style={{
          background: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid #333',
          padding: '1rem 0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: '64px'
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="container" style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
            <Link to="/" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              textDecoration: 'none',
              color: 'white',
              fontSize: '1.75rem',
              fontWeight: 'bold'
            }}>
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Zap size={32} style={{ color: 'var(--cauldron-button-inner)' }} />
              </motion.div>
              <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                FastDEX
              </span>
            </Link>
            
            <nav style={{ display: 'flex', gap: '1.5rem' }}>
              {[
                { path: '/', label: 'Trade', icon: ArrowDownUp },
                { path: '/analytics', label: 'Analytics', icon: Activity }
              ].map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    color: location.pathname === path ? 'var(--cauldron-button-inner)' : '#888',
                    background: location.pathname === path ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                    border: location.pathname === path ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <motion.div 
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(76, 175, 80, 0.15)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                color: '#4caf50',
                fontWeight: '600'
              }}
              whileHover={{ scale: 1.05 }}
            >
              🟢 Linera Testnet
            </motion.div>
            
            {isLoggedIn && primaryWallet ? (
              <motion.button 
                onClick={() => setShowWalletSidebar(true)}
                className="cauldron-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Wallet size={20} />
                <span>{primaryWallet.address.slice(0, 6)}...{primaryWallet.address.slice(-4)}</span>
              </motion.button>
            ) : (
              <motion.button 
                onClick={() => setShowAuthFlow(true)}
                className="cauldron-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Wallet size={20} />
                Connect Wallet
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Wallet Sidebar */}
      <WalletSidebar 
        isOpen={showWalletSidebar}
        onClose={() => setShowWalletSidebar(false)}
        walletAddress={primaryWallet?.address || ''}
      />
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="bg-cauldron-dark" style={{ minHeight: '100vh', color: 'white' }}>
        <NavBar />
        <main style={{ paddingTop: '2rem' }}>
          <AppContent />
        </main>
      </div>
    </Router>
  )
}

export default App
