# FastDEX Micro-Pools Architecture

> **Note**: This document describes the micro-pools vision and proposed architecture. The current Wave 4 implementation provides the foundational CPMM DEX functionality, with full micro-pools features planned for future waves.

## Current Architecture Analysis

### Problems with Current Design
1. **Global State Model**: Single large pools like traditional DEXs (Uniswap style)
2. **Complex Multi-Chain Logic**: Trying to bridge external tokens instead of focusing on Linera native
3. **Centralized Liquidity**: All liquidity in shared pools creates bottlenecks
4. **Missing Linera Advantages**: Not leveraging Linera's microchain architecture

### Cauldron Whitepaper Insights
- **Micro-Pools**: Individual users operate their own CPMM contracts
- **Constant Product Formula**: K = x * y (simple and proven)
- **Aggregation**: Multiple micro-pools can be combined for larger trades
- **UTXO Model**: Each pool is a self-contained unit

## Proposed Micro-Pools Architecture

### Core Concept: Linera as Base Token

Instead of bridging external tokens, use **Linera native tokens** as the base:
- **Base Token**: Linera (native chain token)
- **Quote Tokens**: Custom tokens created on Linera (like microcard's bankroll tokens)
- **Micro-Pools**: Each user creates their own Linera/Token pools

### Architecture Components

#### 1. Micro-Pool Contract
```rust
pub struct MicroPool {
    pub owner: AccountOwner,
    pub token_id: String,           // Custom token identifier
    pub linera_reserve: Amount,     // Linera (base) reserve
    pub token_reserve: Amount,      // Token reserve  
    pub k_constant: Amount,         // K = linera_reserve * token_reserve
    pub fee_rate: u32,              // Fee in basis points (30 = 0.3%)
    pub active: bool,               // Pool can be paused by owner
}
```

#### 2. Pool Operations
```rust
pub enum PoolOperation {
    // Pool Management
    CreatePool { token_id: String, linera_amount: Amount, token_amount: Amount },
    AddLiquidity { linera_amount: Amount, token_amount: Amount },
    RemoveLiquidity { share_percentage: u32 }, // 0-100%
    
    // Trading (anyone can trade against any pool)
    SwapLineraForToken { linera_amount: Amount, min_token_out: Amount },
    SwapTokenForLinera { token_amount: Amount, min_linera_out: Amount },
    
    // Multi-Pool Aggregation
    SwapWithAggregation { 
        from_token: String, 
        to_token: String, 
        amount: Amount,
        pool_ids: Vec<u64> 
    },
}
```

#### 3. Token System (Following Microcard Pattern)
```rust
// Similar to bankroll tokens but for trading pairs
pub struct TradingToken {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    pub total_supply: Amount,
    pub creator: AccountOwner,
}

pub enum TokenOperation {
    CreateToken { symbol: String, name: String, initial_supply: Amount },
    MintToken { token_id: String, amount: Amount, recipient: AccountOwner },
    TransferToken { token_id: String, amount: Amount, recipient: AccountOwner },
}
```

### Key Advantages

#### 1. True Decentralization
- Each user controls their own liquidity
- No shared state bottlenecks
- Censorship resistant

#### 2. Scalability
- Pools operate independently
- Can aggregate multiple pools for large trades
- Leverages Linera's microchain architecture

#### 3. Simplicity
- No complex bridging logic
- Native Linera integration
- Simple CPMM formula

#### 4. Flexibility
- Users set their own fees
- Can pause/unpause pools
- Custom token creation

## Implementation Plan

### Phase 1: Core Micro-Pool Contract
1. **MicroPool State Management**
   - Pool creation and ownership
   - Liquidity addition/removal
   - Basic swap functionality

2. **Token Integration**
   - Reuse microcard's token pattern
   - Simple token creation/transfer
   - Balance tracking

### Phase 2: Trading Engine
1. **Single Pool Swaps**
   - Linera ↔ Token swaps
   - Fee calculation (0.3% standard)
   - Slippage protection

2. **Pool Discovery**
   - List available pools
   - Pool statistics (TVL, volume, APY)
   - Best price routing

### Phase 3: Multi-Pool Aggregation
1. **Route Optimization**
   - Find best price across pools
   - Multi-hop swaps (Linera → TokenA → TokenB)
   - Aggregated liquidity

2. **Advanced Features**
   - Limit orders
   - Pool analytics
   - Yield farming incentives

## Frontend UX Improvements

### Simplified User Flow
1. **Connect Wallet** (Dynamic integration)
2. **Create Pool** (One-click with Linera + custom token)
3. **Trade** (Simple swap interface)
4. **Manage** (Add/remove liquidity)

### Key UI Components
- **Pool Creator**: Simple form to create Linera/Token pools
- **Trading Interface**: Clean swap UI with pool aggregation
- **Pool Manager**: Dashboard for pool owners
- **Token Creator**: Easy custom token deployment

## Technical Benefits

### 1. Leverages Linera Strengths
- Fast finality for trades
- Low transaction costs
- Microchain isolation

### 2. Follows Proven Patterns
- CPMM formula (battle-tested)
- Micro-pools concept (Cauldron whitepaper)
- Token system (microcard implementation)

### 3. Simple Architecture
- No external dependencies
- Native Linera integration
- Minimal attack surface

## Migration Strategy

### From Current Architecture
1. **Keep existing bridge logic** as optional advanced feature
2. **Focus on Linera-native trading** as primary use case
3. **Gradual migration** of frontend to micro-pools interface

### Backward Compatibility
- Existing pools can be migrated to micro-pools
- Bridge functionality remains available
- Users can choose their preferred model

## Conclusion

This micro-pools architecture aligns with:
- **Cauldron whitepaper**: Micro-pools and CPMM formula
- **Linera strengths**: Microchain architecture and native tokens
- **Microcard patterns**: Token system and multi-chain messaging
- **User experience**: Simplified onboarding and trading

The result is a truly decentralized, scalable DEX that leverages Linera's unique advantages while providing a smooth user experience.
