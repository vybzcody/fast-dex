use bridge_tracker::{DepositEvent, WithdrawalRequest};
use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use serde::{Deserialize, Serialize};

#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct BridgeTrackerState {
    pub ethereum_endpoint: RegisterView<String>,
    pub bridge_contract: RegisterView<String>,
    pub usdc_contract: RegisterView<String>,
    pub start_block: RegisterView<u64>,
    pub deposits: MapView<u64, DepositEvent>,
    pub withdrawals: MapView<u64, WithdrawalRequest>,
    pub user_balances: MapView<(String, String), String>, // (user, token) -> balance
}
