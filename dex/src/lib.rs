use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::{
    graphql::GraphQLMutationRoot,
    linera_base_types::{Amount, ApplicationId, ChainId, ContractAbi, ServiceAbi},
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

// Use generic ApplicationId which implements Eq, Hash, etc.
pub type TokenId = ApplicationId;

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum DexOperation {
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
        fee_rate: u32,
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
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub enum DexResponse {
    #[default]
    Ok,
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
pub struct Pool {
    pub token_a: TokenId,
    pub token_b: TokenId,
    pub reserve_a: Amount,
    pub reserve_b: Amount,
    pub total_shares: Amount,
    pub fee_rate: u32,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct DexState {
    pub pools: HashMap<(TokenId, TokenId), Pool>,
    pub protocol_fees: HashMap<(ChainId, TokenId), Amount>,
}

#[cfg(test)]
mod tests;
