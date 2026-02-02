# FastDEX: Micro-Pools DEX on Linera

> **Real-Time Markets Buildathon - Wave 4 Submission**

FastDEX is a decentralized exchange built on Linera that implements a novel micro-pools architecture, enabling individual users to operate their own liquidity pools with custom fee structures. By leveraging Linera's microchain technology, FastDEX achieves parallel execution, instant finality, and true decentralization.

## 🎯 Core Concept

Unlike traditional DEXs with shared global pools, FastDEX allows **each user to create and manage their own liquidity pools**. This micro-pools approach:
- Eliminates shared state bottlenecks
- Enables competitive fee discovery (users set their own rates)
- Scales horizontally with Linera's microchain architecture
- Provides censorship-resistant, user-controlled liquidity

## ✨ Current Implementation

### Smart Contract Features

**✅ Liquidity Pool Management**
- Create pools with custom token pairs and fee rates (0-10%)
- Add liquidity to existing pools with proportional share minting
- Remove liquidity by burning shares
- Constant Product Market Maker (CPMM) formula: `K = x * y`

**✅ Trading Engine**
- Token swaps using CPMM algorithm
- Automatic fee deduction from swap amounts
- Slippage protection through reserve validation
- Real-time price calculation via GraphQL queries

**✅ Balance System**
- User balance tracking per token
- Faucet system for test tokens (demo purposes)
- Deposit and withdrawal request handling
- Multi-chain token support (Ethereum, Polygon, Base, Bitcoin, Solana)

### GraphQL Service

**Query API:**
- `pools`: List all liquidity pools
- `poolByTokens`: Find specific pool by token pair
- `userBalances`: Get all user token balances
- `userBalance`: Get balance for specific user and token
- `estimateSwap`: Calculate expected output for a swap
- `faucetTokens`: List available demo tokens

**Mutation API:**
- `createPool`: Initialize new liquidity pool
- `addLiquidity`: Provide liquidity to pool
- `removeLiquidity`: Withdraw liquidity from pool
- `swapTokens`: Execute token swap
- `claimFaucetTokens`: Get demo tokens for testing
- `processDeposit`: Handle token deposits
- `requestWithdrawal`: Initiate withdrawal

## 🏗️ Architecture

### Contract Structure

```
dex/
├── src/
│   ├── contract.rs    # Core CPMM logic, pool operations
│   ├── service.rs     # GraphQL API implementation
│   ├── lib.rs         # Type definitions and state
│   └── tests.rs       # Test suite
└── Cargo.toml

abi/                    # Shared type definitions
frontend-amm/          # React + TypeScript interface
```

### State Management

```rust
pub struct DexState {
    pub user_balances: HashMap<(AccountOwner, TokenId), Amount>,
    pub pools: HashMap<(TokenId, TokenId), Pool>,
    pub deposit_addresses: HashMap<(AccountOwner, ChainType), String>,
    pub pending_withdrawals: Vec<WithdrawalRequest>,
    pub protocol_fees: HashMap<(ChainId, TokenId), Amount>,
}
```

### Pool Model

```rust
pub struct Pool {
    pub token_a: TokenId,
    pub token_b: TokenId,
    pub reserve_a: Amount,
    pub reserve_b: Amount,
    pub total_shares: Amount,
    pub fee_rate: u32,  // Basis points (30 = 0.3%)
}
```

## Deployment Method

This submission uses the **buildathon template with local network** as specified in the requirements, because:

1. FastDEX requires Ethereum bridge functionality via `linera-sdk` ethereum features
2. Conway testnet doesn't currently support these Ethereum features  
3. Local Linera networks have full Ethereum support enabled

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
# Build and run everything in Docker
docker compose up --build

# Access the frontend at http://localhost:5173
```

### Manual Local Deployment

```bash
# Prerequisites: Rust 1.86+, Node.js LTS, Linera CLI 0.15.8+
rustup target add wasm32-unknown-unknown

# Run the deployment script
./run.bash
```

The script will:
1. Start local Linera network with Ethereum support
2. Deploy bridge-tracker and DEX contracts
3. Configure and launch frontend at localhost:5173

## 🎮 Usage Example

### Via GraphQL

```graphql
# Create a pool
mutation {
  createPool(
    tokenA: { chain: ETHEREUM, address: "usdc", symbol: "USDC" }
    tokenB: { chain: ETHEREUM, address: "eth", symbol: "ETH" }
    amountA: "1000000"
    amountB: "500000"
    feeRate: 30
  )
}

# Execute a swap
mutation {
  swapTokens(
    fromToken: { chain: ETHEREUM, address: "usdc", symbol: "USDC" }
    toToken: { chain: ETHEREUM, address: "eth", symbol: "ETH" }
    amount: "10000"
  )
}

# Query pool info
query {
  poolByTokens(
    tokenA: { chain: ETHEREUM, address: "usdc", symbol: "USDC" }
    tokenB: { chain: ETHEREUM, address: "eth", symbol: "ETH" }
  ) {
    reserveA
    reserveB
    feeRate
  }
}
```

## Bridge Integration

FastDEX integrates with Ethereum via a bridge contract deployed on Sepolia testnet:

**Bridge Contract**: `0x7449478525Eb5106f487d44672B40592Af2a4E49`
**USDC Contract**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

Users can deposit USDC on Ethereum Sepolia, which gets bridged to Linera as wUSDC for trading on FastDEX.

## 🔧 Linera SDK Features Used
- **Smart Contracts**: WASM contract compilation and deployment
- **GraphQL API**: Service layer with async-graphql integration
- **State Management**: Persistent state across microchains
- **Account Authentication**: Signer-based access control

### Advanced Features
- **Amount Types**: Safe arithmetic for token amounts
- **Multi-Chain Types**: Support for various blockchain types
- **Event System**: Contract event handling (planned)
- **Cross-Chain Messaging**: Future bridge implementation

## 📖 Documentation

- **[LITEPAPER.md](./LITEPAPER.md)**: Vision, economic model, and roadmap
- **[MICRO_POOLS_ARCHITECTURE.md](./MICRO_POOLS_ARCHITECTURE.md)**: Technical architecture deep-dive
- **[CHANGELOG.md](./CHANGELOG.md)**: Wave 4 submission changelog

## 🎯 Buildathon Alignment

### Category: Market Infrastructure

FastDEX provides foundational infrastructure for real-time markets on Linera:
- **Instant Settlement**: Sub-second finality for all trades
- **Scalable Liquidity**: Unlimited parallel pools
- **Permissionless Markets**: Anyone can create trading pairs
- **Composable**: Foundation for prediction markets, games, and DeFi apps

### Real-Time Features

1. **Low Latency Trading**: Leverages Linera's microchain architecture for parallel execution
2. **Live Price Discovery**: Real-time swap estimation via GraphQL
3. **Instant Pool Updates**: Immediate reserve adjustments post-trade
4. **Fast Liquidity Management**: Add/remove liquidity with instant confirmation

## 🛠️ Current Status

### Implemented ✅
- [x] Core CPMM swap engine with configurable fees
- [x] Multi-pool creation and management
- [x] Liquidity provision (add/remove)
- [x] GraphQL query and mutation API
- [x] User balance tracking
- [x] Frontend integration (React + Vite)
- [x] Docker deployment setup
- [x] Mock faucet for testing

### In Development 🚧
- [ ] Multi-pool aggregation routing
- [ ] Advanced pool analytics dashboard
- [ ] Limit order functionality
- [ ] Cross-chain bridge integration
- [ ] Yield farming incentives

### Known Limitations
- State persistence is in-memory (loses data on restart)
- Faucet has basic rate limiting 
- Frontend has minimal error handling
- No formal security audit completed

## 💡 Future Roadmap

**Phase 2: Advanced Trading**
- Multi-hop swap routing (A → B → C)
- Best price aggregation across micro-pools
- Limit orders and stop-loss functionality
- Pool performance analytics

**Phase 3: Ecosystem Integration**
- Native token creation and listing
- Cross-chain asset bridging
- Integration with Linera prediction markets
- Mobile-responsive trading interface

## 📝 Wave 4 Changelog

**Initial Submission** (December 15, 2025)
- Implemented complete CPMM DEX with micro-pools architecture
- Created GraphQL service with comprehensive query/mutation API
- Built React frontend with swap and pool management UI
- Added Docker support for easy deployment
- Documented architecture and vision in litepaper

## 👥 Team Information

**Team Name**: [FastDEX Team]
**Discord**: [Your Discord Handle]
**GitHub**: [Your GitHub Username]
**Wallet Address**: [Your Linera Wallet Address - from `linera wallet show`]

## 📄 License

This project is open source and available under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

Built on [Linera](https://linera.io) - the first instant blockchain
- Inspired by Uniswap's CPMM model
- Architecture influenced by Cauldron DEX whitepaper
- Thanks to the Linera team for buildathon support

---

**FastDEX**: Bringing decentralized, scalable, real-time trading to Linera 🚀
