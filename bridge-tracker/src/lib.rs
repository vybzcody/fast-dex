use async_graphql::{Request, Response, SimpleObject};
use linera_sdk::{
    linera_base_types::{ContractAbi, ServiceAbi},
};
use serde::{Deserialize, Serialize};

pub struct BridgeTrackerAbi;

impl ContractAbi for BridgeTrackerAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for BridgeTrackerAbi {
    type Query = Request;
    type QueryResponse = Response;
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Operation {
    /// Update deposits by reading bridge contract events
    UpdateDeposits { to_block: u64 },
    /// Process withdrawal request
    ProcessWithdrawal { 
        user: String,
        token: String, 
        amount: String,
        nonce: u64 
    },
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, SimpleObject)]
pub struct InstantiationArgument {
    /// The Ethereum RPC endpoint
    pub ethereum_endpoint: String,
    /// The bridge contract address
    pub bridge_contract: String,
    /// The USDC contract address
    pub usdc_contract: String,
    /// Starting block number
    pub start_block: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct DepositEvent {
    pub user: String,
    pub token: String,
    pub amount: String,
    pub nonce: u64,
    pub block_number: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, SimpleObject)]
pub struct WithdrawalRequest {
    pub user: String,
    pub token: String,
    pub amount: String,
    pub nonce: u64,
    pub processed: bool,
}
