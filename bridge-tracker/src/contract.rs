#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use bridge_tracker::{BridgeTrackerAbi, InstantiationArgument, Operation};
use linera_sdk::{
    linera_base_types::WithContractAbi,
    views::{RootView, View},
    Contract, ContractRuntime,
};

use self::state::BridgeTrackerState;

pub struct BridgeTrackerContract {
    state: BridgeTrackerState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(BridgeTrackerContract);

impl WithContractAbi for BridgeTrackerContract {
    type Abi = BridgeTrackerAbi;
}

impl Contract for BridgeTrackerContract {
    type Message = ();
    type InstantiationArgument = InstantiationArgument;
    type Parameters = ();
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = BridgeTrackerState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        BridgeTrackerContract { state, runtime }
    }

    async fn instantiate(&mut self, argument: InstantiationArgument) {
        self.runtime.application_parameters();
        
        self.state.ethereum_endpoint.set(argument.ethereum_endpoint);
        self.state.bridge_contract.set(argument.bridge_contract);
        self.state.usdc_contract.set(argument.usdc_contract);
        self.state.start_block.set(argument.start_block);
        
        self.state.save().await.expect("Failed to save state");
    }

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response {
        match operation {
            Operation::UpdateDeposits { to_block } => {
                self.update_deposits(to_block).await;
            }
            Operation::ProcessWithdrawal { user, token, amount, nonce } => {
                self.process_withdrawal(user, token, amount, nonce).await;
            }
        }
    }

    async fn execute_message(&mut self, _message: ()) {
        panic!("Messages not supported");
    }

    async fn store(mut self) {
        self.state.save().await.expect("Failed to save state");
    }
}

impl BridgeTrackerContract {
    async fn update_deposits(&mut self, end_block: u64) {
        let request = async_graphql::Request::new(format!(
            r#"query {{ readDepositEvents(endBlock: {end_block}) }}"#
        ));

        let application_id = self.runtime.application_id();
        let response = self.runtime.query_service(application_id, &request);

        // Process deposit events and mint tokens
        // Implementation will read Deposit events from bridge contract
    }

    async fn process_withdrawal(&mut self, user: String, token: String, amount: String, nonce: u64) {
        // Burn tokens and emit withdrawal request
        // Bridge operator will execute withdrawal on Ethereum
    }
}
