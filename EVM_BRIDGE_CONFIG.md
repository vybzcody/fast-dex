# EVM Bridge Configuration

## Testnet Networks

### Sepolia (Ethereum Testnet)
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_KEY`
- **Chain ID**: 11155111
- **Native Token**: ETH
- **USDC Contract**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### Arbitrum Sepolia (Arbitrum Testnet)  
- **RPC URL**: `https://sepolia-rollup.arbitrum.io/rpc`
- **Chain ID**: 421614
- **Native Token**: ETH
- **USDC Contract**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`

## Base Token Strategy: **wUSDC**

### Why USDC as Base:
- ✅ **Stable pricing** - easier for users to understand values
- ✅ **Precise calculations** - no ETH volatility affecting pool math
- ✅ **Universal unit of account** - like traditional exchanges
- ✅ **Better UX** - users think in dollar terms

### Supported Tokens
1. **wUSDC** (Base token - wrapped USDC from both networks)
2. **wETH** (Wrapped ETH from both networks)

### Liquidity Pools
- **All pairs trade against wUSDC**: wETH/wUSDC
- **Future tokens**: wBTC/wUSDC, wDAI/wUSDC, etc.

### Bridge Flow
1. **Deposit**: User sends USDC/ETH to bridge contract
2. **Mint**: Linera mints wUSDC/wETH 
3. **Trade**: All trading happens against wUSDC base
4. **Withdraw**: User burns tokens, receives USDC/ETH on chosen network
