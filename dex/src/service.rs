#![cfg_attr(target_arch = "wasm32", no_main)]

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema, SimpleObject};
use dex::{BridgeToken, DexAbi, DexOperation, DexState, Pool};
use linera_sdk::{
    abi::WithServiceAbi,
    graphql::GraphQLMutationRoot,
    linera_base_types::Amount,
    Service, ServiceRuntime,
};

pub struct DexService {
    state: Arc<DexState>,
    runtime: Arc<ServiceRuntime<Self>>,
}

linera_sdk::service!(DexService);

impl WithServiceAbi for DexService {
    type Abi = DexAbi;
}

impl Service for DexService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = DexState::default();
        DexService {
            state: Arc::new(state),
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, query: Self::Query) -> Self::QueryResponse {
        Schema::build(
            QueryRoot {
                state: self.state.clone(),
            },
            DexOperation::mutation_root(self.runtime.clone()),
            EmptySubscription,
        )
        .finish()
        .execute(query)
        .await
    }
}

#[derive(SimpleObject)]
struct UserBalance {
    token: BridgeToken,
    amount: Amount,
}

struct QueryRoot {
    state: Arc<DexState>,
}

#[Object]
impl QueryRoot {
    async fn pools(&self) -> Vec<Pool> {
        self.state.pools.values().cloned().collect()
    }

    async fn pool_by_tokens(&self, token_a: BridgeToken, token_b: BridgeToken) -> Option<Pool> {
        let pool_key = (token_a, token_b);
        self.state.pools.get(&pool_key).cloned()
    }

    async fn user_balance(&self, user: String, token: BridgeToken) -> Amount {
        self.state.user_balances
            .get(&(user, token))
            .copied()
            .unwrap_or_default()
    }

    async fn user_balances(&self, user: String) -> Vec<UserBalance> {
        self.state.user_balances
            .iter()
            .filter(|((u, _), _)| u == &user)
            .map(|((_, token), amount)| UserBalance {
                token: token.clone(),
                amount: *amount,
            })
            .collect()
    }

    async fn estimate_swap(&self, from_token: BridgeToken, to_token: BridgeToken, amount: Amount) -> Option<Amount> {
        let pool_key = (from_token.clone(), to_token.clone());
        let pool = self.state.pools.get(&pool_key)?;

        let (input_reserve, output_reserve) =
            if pool.token_a == from_token {
                (pool.reserve_a, pool.reserve_b)
            } else {
                (pool.reserve_b, pool.reserve_a)
            };

        if input_reserve == Amount::ZERO || amount == Amount::ZERO {
            return None;
        }

        // Simple CPMM: output = (output_reserve * amount) / (input_reserve + amount)
        let input_u128 = input_reserve.to_attos();
        let output_u128 = output_reserve.to_attos();
        let amount_u128 = amount.to_attos();
        
        let output_amount_u128 = (output_u128 * amount_u128) / (input_u128 + amount_u128);
        Some(Amount::from_attos(output_amount_u128))
    }
}
