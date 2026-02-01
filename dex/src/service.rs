#![cfg_attr(target_arch = "wasm32", no_main)]

use std::sync::Arc;

use async_graphql::{EmptySubscription, Object, Schema};
use dex::{DexAbi, DexOperation, DexState, Pool, TokenId};
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

struct QueryRoot {
    state: Arc<DexState>,
}

#[Object]
impl QueryRoot {
    async fn pools(&self) -> Vec<Pool> {
        self.state.pools.values().cloned().collect()
    }

    async fn pool_by_tokens(&self, token_a: TokenId, token_b: TokenId) -> Option<Pool> {
        let pool_key = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };
        self.state.pools.get(&pool_key).cloned()
    }

    async fn estimate_swap(&self, from_token: TokenId, to_token: TokenId, amount: Amount) -> Option<Amount> {
        let pool_key = if from_token < to_token {
            (from_token, to_token)
        } else {
            (to_token, from_token)
        };

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

        let fee_rate = pool.fee_rate as u128;
        let amount_with_fee = Into::<u128>::into(amount) as u128;
        let fee_amount = amount_with_fee.saturating_mul(fee_rate).saturating_div(10_000);
        let amount_after_fee = amount_with_fee.saturating_sub(fee_amount);

        let input_reserve_u128 = Into::<u128>::into(input_reserve) as u128;
        let output_reserve_u128 = Into::<u128>::into(output_reserve) as u128;

        let denominator = input_reserve_u128.saturating_add(amount_after_fee);
        if denominator == 0 {
            return None;
        }

        let numerator = output_reserve_u128.saturating_mul(amount_after_fee);
        let received_u128 = numerator.saturating_div(denominator);
        Some(Amount::from_tokens(received_u128))
    }
}
