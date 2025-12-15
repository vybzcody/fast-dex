# Changelog

All notable changes to FastDEX for each buildathon wave.

## Wave 4 - December 15, 2025

### Initial Submission

**Core DEX Implementation**
- Implemented Constant Product Market Maker (CPMM) formula for token swaps
- Created liquidity pool system with customizable fee rates (0-10%)
- Built complete add/remove liquidity functionality with proportional share calculation
- Developed user balance tracking system across multiple tokens
- Added faucet system for test token distribution

**GraphQL API**
- Query operations: `pools`, `poolByTokens`, `userBalances`, `userBalance`, `estimateSwap`, `faucetTokens`
- Mutation operations: `createPool`, `addLiquidity`, `removeLiquidity`, `swapTokens`, `claimFaucetTokens`, `processDeposit`, `requestWithdrawal`
- Real-time swap estimation without executing transactions

**Frontend**
- React + TypeScript + Vite application
- Swap interface with price calculation
- Pool management dashboard
- Balance display for multiple tokens
- Integration with Linera GraphQL service

**Infrastructure**
- Docker containerization with automated build
- Deployment script (`run.bash`) for local Linera network
- Comprehensive documentation (README, LITEPAPER, ARCHITECTURE)
- Automated config generation for frontend

**Multi-Chain Support**
- Token type definitions for Ethereum, Polygon, Base, Bitcoin, Solana
- Deposit/withdrawal request handling (foundation for bridge)
- Chain-specific address generation

### Technical Highlights

**Linera SDK Features Used:**
- Smart contract development with WASM compilation
- GraphQL service layer with async-graphql
- Account authentication and signer validation
- Amount type for safe arithmetic operations
- Multi-chain type system

**Architecture Decisions:**
- Micro-pools model (vs traditional shared pools)
- In-memory state management (temporary for demo)
- Basis points system for fee rates (10000 = 100%)
- Proportional share minting for liquidity providers
- Normalized pool keys to prevent duplicates

### Known Issues & Limitations

- State is not persisted across contract restarts
- Faucet rate limiting is basic (max 10,000 tokens/claim)
- No formal slippage tolerance configuration
- Frontend error handling needs improvement
- Share ownership tracking is pool-level (not per-user stored separately)

### Future Work

For subsequent waves, planned improvements include:
- Multi-pool aggregation for better prices
- Advanced analytics dashboard
- Persistent state management
- Cross-chain bridge implementation
- Limit order functionality
- Enhanced security measures

---

**Submission Date**: December 15, 2025  
**Wave**: 4  
**Status**: Initial Release
