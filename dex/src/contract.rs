#![cfg_attr(target_arch = "wasm32", no_main)]

use dex::{BridgeToken, DexAbi, DexInstantiationArgument, DexOperation, DexResponse, DexState, Pool};
use linera_sdk::{
    linera_base_types::{AccountOwner, Amount},
    Contract, ContractRuntime,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DexError {
    #[error("Insufficient balance")]
    InsufficientBalance,
    #[error("Pool does not exist")]
    PoolNotFound,
    #[error("Pool already exists")]
    PoolAlreadyExists,
    #[error("Invalid pool state")]
    InvalidPoolState,
    #[error("Insufficient pool reserves")]
    InsufficientPoolReserves,
    #[error("Invalid calculation")]
    InvalidCalculation,
    #[error("Pool has no shares")]
    NoPoolShares,
    #[error("Zero reserve")]
    ZeroReserve,
    #[error("Insufficient output reserve")]
    InsufficientOutputReserve,
}

pub struct DexContract {
    state: DexState,
    runtime: ContractRuntime<Self>,
}

linera_sdk::contract!(DexContract);

impl linera_sdk::abi::WithContractAbi for DexContract {
    type Abi = DexAbi;
}

impl Contract for DexContract {
    type Message = ();
    type InstantiationArgument = DexInstantiationArgument;
    type Parameters = ();
    type EventValue = ();
    
    async fn load(runtime: ContractRuntime<Self>) -> Self {
        DexContract {
            state: DexState::default(),
            runtime,
        }
    }

    async fn instantiate(&mut self, argument: Self::InstantiationArgument) {
        self.state.bridge_tracker_app = argument.bridge_tracker_app;
    }

    async fn execute_operation(&mut self, operation: DexOperation) -> DexResponse {
        match operation {
            DexOperation::SwapTokens { from_token, to_token, amount } => {
                self.swap_tokens(from_token, to_token, amount).await
            },
            DexOperation::CreatePool { token_a, token_b, amount_a, amount_b, fee_rate } => {
                self.create_pool(token_a, token_b, amount_a, amount_b, fee_rate).await
            },
            DexOperation::AddLiquidity { token_a, token_b, amount_a, amount_b } => {
                self.add_liquidity(token_a, token_b, amount_a, amount_b).await
            },
            DexOperation::RemoveLiquidity { token_a, token_b, share_amount } => {
                self.remove_liquidity(token_a, token_b, share_amount).await
            },
            DexOperation::MintBridgeToken { token, user, amount } => {
                self.mint_bridge_token(token, user, amount).await
            },
            DexOperation::BurnBridgeToken { token, user, amount } => {
                self.burn_bridge_token(token, user, amount).await
            },
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {}

    async fn store(self) {}
}

impl DexContract {
    fn get_user(&mut self) -> String {
        self.runtime.authenticated_signer().unwrap().to_string()
    }

    fn get_user_balance(&self, user: &str, token: &BridgeToken) -> Amount {
        self.state.user_balances
            .get(&(user.to_string(), token.clone()))
            .copied()
            .unwrap_or_default()
    }

    fn set_user_balance(&mut self, user: &str, token: &BridgeToken, amount: Amount) {
        self.state.user_balances.insert((user.to_string(), token.clone()), amount);
    }

    async fn mint_bridge_token(&mut self, token: BridgeToken, user: String, amount: Amount) -> DexResponse {
        let current_balance = self.get_user_balance(&user, &token);
        let new_balance = Amount::from_attos(current_balance.to_attos() + amount.to_attos());
        self.set_user_balance(&user, &token, new_balance);
        DexResponse::Ok
    }

    async fn burn_bridge_token(&mut self, token: BridgeToken, user: String, amount: Amount) -> DexResponse {
        let current_balance = self.get_user_balance(&user, &token);
        if current_balance.to_attos() < amount.to_attos() {
            return DexResponse::Error("Insufficient balance".to_string());
        }
        let new_balance = Amount::from_attos(current_balance.to_attos() - amount.to_attos());
        self.set_user_balance(&user, &token, new_balance);
        DexResponse::Ok
    }

    async fn create_pool(
        &mut self, 
        token_a: BridgeToken, 
        token_b: BridgeToken, 
        amount_a: Amount, 
        amount_b: Amount,
        fee_rate: u32,
    ) -> DexResponse {
        let pool_key = (token_a.clone(), token_b.clone());
        
        if self.state.pools.contains_key(&pool_key) {
            return DexResponse::Error("Pool already exists".to_string());
        }

        let user = self.get_user();
        
        // Check user has enough tokens
        if self.get_user_balance(&user, &token_a).to_attos() < amount_a.to_attos() ||
           self.get_user_balance(&user, &token_b).to_attos() < amount_b.to_attos() {
            return DexResponse::Error("Insufficient balance".to_string());
        }

        // Deduct tokens from user
        let balance_a = self.get_user_balance(&user, &token_a);
        let balance_b = self.get_user_balance(&user, &token_b);
        self.set_user_balance(&user, &token_a, Amount::from_attos(balance_a.to_attos() - amount_a.to_attos()));
        self.set_user_balance(&user, &token_b, Amount::from_attos(balance_b.to_attos() - amount_b.to_attos()));

        // Create pool
        let pool = Pool {
            token_a: token_a.clone(),
            token_b: token_b.clone(),
            reserve_a: amount_a,
            reserve_b: amount_b,
            total_shares: amount_a, // Initial shares = amount_a
            fee_rate,
        };

        self.state.pools.insert(pool_key, pool);
        DexResponse::PoolCreated { success: true }
    }

    async fn swap_tokens(
        &mut self,
        from_token: BridgeToken,
        to_token: BridgeToken,
        amount: Amount,
    ) -> DexResponse {
        let user = self.get_user();
        
        // Check user has enough tokens
        if self.get_user_balance(&user, &from_token).to_attos() < amount.to_attos() {
            return DexResponse::Error("Insufficient balance".to_string());
        }

        let pool_key = (from_token.clone(), to_token.clone());
        let pool = match self.state.pools.get_mut(&pool_key) {
            Some(pool) => pool,
            None => return DexResponse::Error("Pool not found".to_string()),
        };

        // Calculate output using CPMM formula: dy = (y * dx) / (x + dx)
        let (input_reserve, output_reserve) = if from_token == pool.token_a {
            (pool.reserve_a, pool.reserve_b)
        } else {
            (pool.reserve_b, pool.reserve_a)
        };

        let input_u128 = input_reserve.to_attos();
        let output_u128 = output_reserve.to_attos();
        let amount_u128 = amount.to_attos();
        
        let output_amount_u128 = (output_u128 * amount_u128) / (input_u128 + amount_u128);
        
        if output_amount_u128 >= output_u128 {
            return DexResponse::Error("Insufficient pool reserves".to_string());
        }

        // Update pool reserves
        if from_token == pool.token_a {
            pool.reserve_a = Amount::from_attos(pool.reserve_a.to_attos() + amount_u128);
            pool.reserve_b = Amount::from_attos(pool.reserve_b.to_attos() - output_amount_u128);
        } else {
            pool.reserve_b = Amount::from_attos(pool.reserve_b.to_attos() + amount_u128);
            pool.reserve_a = Amount::from_attos(pool.reserve_a.to_attos() - output_amount_u128);
        }

        // Update user balances
        let from_balance = self.get_user_balance(&user, &from_token);
        let to_balance = self.get_user_balance(&user, &to_token);
        self.set_user_balance(&user, &from_token, Amount::from_attos(from_balance.to_attos() - amount_u128));
        self.set_user_balance(&user, &to_token, Amount::from_attos(to_balance.to_attos() + output_amount_u128));

        DexResponse::SwapResult { received: Amount::from_attos(output_amount_u128) }
    }

    async fn add_liquidity(
        &mut self,
        token_a: BridgeToken,
        token_b: BridgeToken,
        amount_a: Amount,
        amount_b: Amount,
    ) -> DexResponse {
        DexResponse::Error("Not implemented".to_string())
    }

    async fn remove_liquidity(
        &mut self,
        token_a: BridgeToken,
        token_b: BridgeToken,
        share_amount: Amount,
    ) -> DexResponse {
        DexResponse::Error("Not implemented".to_string())
    }
}
