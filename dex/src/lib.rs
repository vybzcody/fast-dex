use async_graphql::{InputObject, Request, Response, SimpleObject};
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

// Bridge token identifiers
#[derive(Debug, Clone, PartialEq, Eq, Hash, Deserialize, Serialize, SimpleObject, InputObject)]
#[graphql(input_name = "BridgeTokenInput")]
pub struct BridgeToken {
    pub symbol: String,      // "wUSDC", "wETH"
    pub network: String,     // "sepolia", "arbitrum-sepolia"
}

#[derive(Debug, Deserialize, Serialize, GraphQLMutationRoot)]
pub enum DexOperation {
    SwapTokens {
        from_token: BridgeToken,
        to_token: BridgeToken,
        amount: Amount,
    },
    CreatePool {
        token_a: BridgeToken,
        token_b: BridgeToken,
        amount_a: Amount,
        amount_b: Amount,
        fee_rate: u32,
    },
    AddLiquidity {
        token_a: BridgeToken,
        token_b: BridgeToken,
        amount_a: Amount,
        amount_b: Amount,
    },
    RemoveLiquidity {
        token_a: BridgeToken,
        token_b: BridgeToken,
        share_amount: Amount,
    },
    // Bridge integration operations
    MintBridgeToken {
        token: BridgeToken,
        user: String,
        amount: Amount,
    },
    BurnBridgeToken {
        token: BridgeToken,
        user: String,
        amount: Amount,
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
    pub token_a: BridgeToken,
    pub token_b: BridgeToken,
    pub reserve_a: Amount,
    pub reserve_b: Amount,
    pub total_shares: Amount,
    pub fee_rate: u32,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct DexState {
    pub pools: HashMap<(BridgeToken, BridgeToken), Pool>,
    pub user_balances: HashMap<(String, BridgeToken), Amount>, // (user, token) -> balance
    pub bridge_tracker_app: Option<ApplicationId>, // Reference to bridge tracker
}

#[derive(Debug, Deserialize, Serialize, SimpleObject)]
pub struct DexInstantiationArgument {
    pub bridge_tracker_app: Option<ApplicationId>,
}

#[cfg(test)]
mod tests;
