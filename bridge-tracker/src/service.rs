#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;
use async_graphql::{EmptySubscription, Request, Response, Schema};
use bridge_tracker::Operation;
use linera_sdk::{
    ethereum::{EthereumDataType, EthereumEvent, EthereumQueries, ServiceEthereumClient},
    linera_base_types::WithServiceAbi,
    views::View,
    Service, ServiceRuntime,
};

use self::state::BridgeTrackerState;

#[derive(Clone)]
pub struct BridgeTrackerService {
    state: Arc<BridgeTrackerState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(BridgeTrackerService);

impl WithServiceAbi for BridgeTrackerService {
    type Abi = bridge_tracker::BridgeTrackerAbi;
}

impl Service for BridgeTrackerService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = BridgeTrackerState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        BridgeTrackerService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        let schema = Schema::build(
            QueryRoot {
                service: self.clone(),
            },
            MutationRoot,
            EmptySubscription,
        )
        .finish();
        schema.execute(request).await
    }
}

struct QueryRoot {
    service: BridgeTrackerService,
}

#[async_graphql::Object]
impl QueryRoot {
    async fn read_deposit_events(&self, end_block: u64) -> Vec<bridge_tracker::DepositEvent> {
        let url = self.service.state.ethereum_endpoint.get().clone();
        let contract_address = self.service.state.bridge_contract.get().clone();
        let start_block = *self.service.state.start_block.get();

        let client = ServiceEthereumClient::new(url);
        
        // Read Deposit events from bridge contract
        let event_signature = "Deposit(address indexed,address indexed,uint256,uint256 indexed)";
        
        match client.read_events(&contract_address, event_signature, start_block, end_block).await {
            Ok(events) => {
                events.into_iter().map(|event| {
                    bridge_tracker::DepositEvent {
                        user: event.topics[1].clone(),
                        token: event.topics[2].clone(), 
                        amount: event.data.clone(),
                        nonce: event.topics[3].parse().unwrap_or(0),
                        block_number: event.block_number,
                    }
                }).collect()
            }
            Err(_) => vec![]
        }
    }

    async fn user_balance(&self, user: String, token: String) -> String {
        self.service.state.user_balances
            .get(&(user, token))
            .await
            .unwrap_or_default()
            .unwrap_or_default()
    }
}

struct MutationRoot;

#[async_graphql::Object]
impl MutationRoot {
    async fn placeholder(&self) -> bool {
        true
    }
}
