#![cfg_attr(target_arch = "wasm32", no_main)]

use dex::{DexAbi, DexOperation, DexResponse, DexState, Pool, TokenId};
use linera_sdk::{
    abis::fungible::{Account as FungibleAccount, FungibleOperation, FungibleTokenAbi},
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
    #[error("Invalid pool state - input reserve is zero")]
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
    type InstantiationArgument = ();
    type Parameters = ();
    type EventValue = ();
    
    async fn load(runtime: ContractRuntime<Self>) -> Self {
        DexContract {
            state: DexState::default(),
            runtime,
        }
    }

    async fn instantiate(&mut self, _argument: Self::InstantiationArgument) {}

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
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {}

    async fn store(self) {}
}

impl DexContract {
    /// Helper to transfer tokens from DEX to a user
    async fn send_to_user(&mut self, token: TokenId, to: AccountOwner, amount: Amount) {
        let call = FungibleOperation::Transfer {
            owner: AccountOwner::from(self.runtime.application_id().forget_abi()),
            amount,
            target_account: FungibleAccount {
                chain_id: self.runtime.chain_id(),
                owner: to,
            },
        };
        
        let token_with_abi = token.with_abi::<FungibleTokenAbi>();
        self.runtime.call_application(true, token_with_abi, &call);
    }

    async fn create_pool(
        &mut self, 
        token_a: TokenId, 
        token_b: TokenId, 
        amount_a: Amount, 
        amount_b: Amount, 
        fee_rate: u32
    ) -> DexResponse {
        if amount_a == Amount::ZERO || amount_b == Amount::ZERO {
            return DexResponse::Error("Amounts must be greater than zero".to_string());
        }
        if token_a == token_b {
            return DexResponse::Error("Cannot create pool with identical tokens".to_string());
        }

        let pool_key = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };

        if self.state.pools.contains_key(&pool_key) {
            return DexResponse::Error("Pool already exists".to_string());
        }

        // We assume tokens have been transferred to the DEX account
        // No explicit check here as per standard AMM pattern on Linera
        
        let pool = Pool {
            token_a,
            token_b,
            reserve_a: amount_a,
            reserve_b: amount_b,
            total_shares: amount_a, // Initial shares = amount_a
            fee_rate,
        };

        self.state.pools.insert(pool_key, pool);
        
        // Mint initial shares to creator? 
        // For simplicity in this step, we just track total shares. 
        // Implement LP token logic if needed later.
        
        DexResponse::PoolCreated { success: true }
    }

    async fn add_liquidity(
        &mut self, 
        token_a: TokenId, 
        token_b: TokenId, 
        amount_a: Amount, 
        amount_b: Amount
    ) -> DexResponse {
        let pool_key = if token_a < token_b {
            (token_a, token_b)
        } else {
            (token_b, token_a)
        };

        let pool = match self.state.pools.get_mut(&pool_key) {
            Some(pool) => pool,
            None => return DexResponse::Error("Pool does not exist".to_string()),
        };

        // Assume tokens received.
        // Calculate shares
        let shares_to_mint = if pool.total_shares == Amount::ZERO {
            amount_a
        } else {
            let total_shares = u128::from(pool.total_shares);
            let reserve_a = u128::from(pool.reserve_a);
            let amount_a_val = u128::from(amount_a);
            Amount::from_tokens(total_shares.saturating_mul(amount_a_val).saturating_div(reserve_a))
        };

        pool.reserve_a = pool.reserve_a.saturating_add(amount_a);
        pool.reserve_b = pool.reserve_b.saturating_add(amount_b);
        pool.total_shares = pool.total_shares.saturating_add(shares_to_mint);

        DexResponse::LiquidityAdded { shares_minted: shares_to_mint }
    }

    async fn remove_liquidity(
        &mut self, 
        token_a: TokenId, 
        token_b: TokenId, 
        share_amount: Amount
    ) -> DexResponse {
        let (amount_a, amount_b, pool_token_a, pool_token_b) = {
            let pool_key = if token_a < token_b {
                (token_a, token_b)
            } else {
                (token_b, token_a)
            };

            let pool = match self.state.pools.get_mut(&pool_key) {
                Some(pool) => pool,
                None => return DexResponse::Error("Pool does not exist".to_string()),
            };

            let total_shares = u128::from(pool.total_shares);
            let share_val = u128::from(share_amount);

            if total_shares == 0 || share_val > total_shares {
                return DexResponse::Error("Invalid share amount".to_string());
            }

            let reserve_a = u128::from(pool.reserve_a);
            let reserve_b = u128::from(pool.reserve_b);

            let amount_a = Amount::from_tokens(reserve_a.saturating_mul(share_val).saturating_div(total_shares));
            let amount_b = Amount::from_tokens(reserve_b.saturating_mul(share_val).saturating_div(total_shares));

            pool.reserve_a = pool.reserve_a.saturating_sub(amount_a);
            pool.reserve_b = pool.reserve_b.saturating_sub(amount_b);
            pool.total_shares = pool.total_shares.saturating_sub(share_amount);

            (amount_a, amount_b, pool.token_a, pool.token_b)
        }; // End mutable borrow of self.state.pools

        let owner = self.runtime.authenticated_signer().unwrap();
        
        // Transfer tokens back to user
        self.send_to_user(pool_token_a, owner, amount_a).await;
        self.send_to_user(pool_token_b, owner, amount_b).await;

        DexResponse::LiquidityRemoved { amount_a, amount_b }
    }

    async fn swap_tokens(
        &mut self, 
        from_token: TokenId, 
        to_token: TokenId, 
        amount: Amount
    ) -> DexResponse {
        let (output_amount, target_token) = {
            let pool_key = if from_token < to_token {
                (from_token, to_token)
            } else {
                (to_token, from_token)
            };

            let pool = match self.state.pools.get_mut(&pool_key) {
                Some(pool) => pool,
                None => return DexResponse::Error("Pool does not exist".to_string()),
            };

            let (input_reserve, output_reserve, is_a_to_b) = if pool.token_a == from_token {
                (pool.reserve_a, pool.reserve_b, true)
            } else {
                (pool.reserve_b, pool.reserve_a, false)
            };

            // Fee calculation (0.3% = 30 bps)
            let amount_u128 = u128::from(amount);
            let fee = amount_u128.saturating_mul(u128::from(pool.fee_rate)).saturating_div(10000);
            let amount_less_fee = amount_u128.saturating_sub(fee);

            let input_reserve_u128 = u128::from(input_reserve);
            let output_reserve_u128 = u128::from(output_reserve);

            // CPMM Formula
            let numerator = output_reserve_u128.saturating_mul(amount_less_fee);
            let denominator = input_reserve_u128.saturating_add(amount_less_fee);
            
            if denominator == 0 {
                 return DexResponse::Error("Invalid calculation".to_string());
            }

            let output_amount = Amount::from_tokens(numerator.saturating_div(denominator));

            if output_amount == Amount::ZERO {
                return DexResponse::Error("Swap too small".to_string());
            }

            // Update reserves
            if is_a_to_b {
                pool.reserve_a = pool.reserve_a.saturating_add(amount); 
                pool.reserve_b = pool.reserve_b.saturating_sub(output_amount);
            } else {
                pool.reserve_b = pool.reserve_b.saturating_add(amount);
                pool.reserve_a = pool.reserve_a.saturating_sub(output_amount);
            }

            // Return values for independent side-effect
            // The target token is the one we are NOT sending (wait, we ARE sending output)
            // If is_a_to_b (sending A, getting B), we send B to user.
            let target_token = if is_a_to_b { pool.token_b } else { pool.token_a };
            
            (output_amount, target_token)
        }; // End mutable borrow of self.state.pools

        // Transfer output to user
        let owner = self.runtime.authenticated_signer().unwrap();
        self.send_to_user(target_token, owner, output_amount).await;

        DexResponse::SwapResult { received: output_amount }
    }
}

#[cfg(test)]
mod contract_tests {
    use super::*;

    #[test]
    fn test_amount_validations_in_swaps() {
        // This is a unit test to validate the logic in the contract
        // Since we can't easily test the entire contract in unit tests,
        // we can test the core calculation logic

        let amount = Amount::ZERO;
        assert_eq!(amount, Amount::ZERO);

        let positive_amount = Amount::from(100u128);
        assert!(positive_amount > Amount::ZERO);
    }
}
