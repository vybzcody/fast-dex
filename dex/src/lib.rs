use async_graphql::{Request, Response, SimpleObject, InputObject, Enum};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{AccountOwner, Amount, ChainId, ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize)]
pub struct DexAbi;

impl ContractAbi for DexAbi {
    type Operation = DexOperation;
    type Response = DexResponse;
}

impl ServiceAbi for DexAbi {
    type Query = Request;
    type QueryResponse = Response;
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord, Hash, Enum)]
pub enum ChainType {
    Ethereum,
    Polygon,
    Base,
    Bitcoin,
    Solana,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq, Hash, PartialOrd, Ord, SimpleObject, InputObject)]
#[graphql(input_name = "TokenIdInput")]
pub struct TokenId {
    pub chain: ChainType,
    pub address: String,
    pub symbol: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
pub struct DepositAddress {
    pub chain: ChainType,
    pub address: String,
    pub user: AccountOwner,
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum DexOperation {
    GenerateDepositAddress {
        chain: ChainType,
    },
    ProcessDeposit {
        token: TokenId,
        amount: Amount,
        tx_hash: String,
    },
    SwapTokens {
        from_token: TokenId,
        to_token: TokenId,
        amount: Amount,
    },
    CreatePool {
        token_a: TokenId,
        token_b: TokenId,
        amount_a: Amount,
        amount_b: Amount,
        fee_rate: u32,  // basis points (e.g., 30 = 0.3%)
    },
    AddLiquidity {
        token_a: TokenId,
        token_b: TokenId,
        amount_a: Amount,
        amount_b: Amount,
    },
    RemoveLiquidity {
        token_a: TokenId,
        token_b: TokenId,
        share_amount: Amount,
    },
    RequestWithdrawal {
        token: TokenId,
        amount: Amount,
        target_address: String,
    },
    ClaimFaucetTokens {
        token: TokenId,
        amount: Amount,
    },
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub enum DexResponse {
    #[default]
    Ok,
    DepositAddress(DepositAddress),
    Balance(Amount),
    SwapResult {
        received: Amount,
    },
    PoolCreated {
        success: bool,
    },
    LiquidityAdded {
        shares_minted: Amount,
    },
    LiquidityRemoved {
        amount_a: Amount,
        amount_b: Amount,
    },
    Error(String),
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
pub struct UserBalance {
    pub owner: AccountOwner,
    pub token: TokenId,
    pub amount: Amount,
}

#[derive(Debug, Clone, Deserialize, Serialize, SimpleObject)]
pub struct Pool {
    pub token_a: TokenId,
    pub token_b: TokenId,
    pub reserve_a: Amount,
    pub reserve_b: Amount,
    pub total_shares: Amount,
    pub fee_rate: u32,  // Fee rate in basis points (e.g., 30 = 0.3%)
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct DexState {
    pub user_balances: HashMap<(AccountOwner, TokenId), Amount>,
    pub pools: HashMap<(TokenId, TokenId), Pool>,
    pub deposit_addresses: HashMap<(AccountOwner, ChainType), String>,
    pub pending_withdrawals: Vec<WithdrawalRequest>,
    pub protocol_fees: HashMap<(ChainId, TokenId), Amount>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct WithdrawalRequest {
    pub id: u64,
    pub user: AccountOwner,
    pub token: TokenId,
    pub amount: Amount,
    pub target_address: String,
    pub created_at: u64,
}

#[cfg(test)]
mod tests;
