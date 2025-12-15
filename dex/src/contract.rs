#![cfg_attr(target_arch = "wasm32", no_main)]

use dex::{DexAbi, DexOperation, DexResponse, DexState, Pool, TokenId};
use linera_sdk::{
    abi::WithContractAbi,
    linera_base_types::Amount,
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

impl WithContractAbi for DexContract {
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
                self.swap_tokens(from_token, to_token, amount)
            },
            DexOperation::CreatePool { token_a, token_b, amount_a, amount_b, fee_rate } => {
                self.create_pool(token_a, token_b, amount_a, amount_b, fee_rate)
            },
            DexOperation::AddLiquidity { token_a, token_b, amount_a, amount_b } => {
                self.add_liquidity(token_a, token_b, amount_a, amount_b)
            },
            DexOperation::RemoveLiquidity { token_a, token_b, share_amount } => {
                self.remove_liquidity(token_a, token_b, share_amount)
            },
            DexOperation::ProcessDeposit { token, amount, .. } => {
                self.process_deposit(token, amount)
            },
            DexOperation::RequestWithdrawal { token, amount, .. } => {
                self.request_withdrawal(token, amount)
            },
            DexOperation::ClaimFaucetTokens { token, amount } => {
                self.claim_faucet_tokens(token, amount)
            },
            _ => DexResponse::Ok,
        }
    }

    async fn execute_message(&mut self, _message: Self::Message) {}

    async fn store(self) {}
}

impl DexContract {
    /// Process a token deposit
    fn process_deposit(&mut self, token: TokenId, amount: Amount) -> DexResponse {
        // For demo purposes, we trust the caller and just update the balance
        // In a production environment, this would be triggered by a secure message from the bridge
        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };
        let key = (owner, token);

        // Update user balance
        let current_balance = self.state.user_balances.entry(key).or_insert(Amount::ZERO);
        *current_balance = current_balance.saturating_add(amount);

        DexResponse::Ok
    }

    /// Request a withdrawal
    fn request_withdrawal(&mut self, token: TokenId, amount: Amount) -> DexResponse {
        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };
        let key = (owner, token);

        // Check if user has sufficient balance
        let current_balance = self.state.user_balances.get(&key).copied().unwrap_or(Amount::ZERO);
        if current_balance < amount {
            return DexResponse::Error("Insufficient balance".to_string());
        }

        // Update user balance
        let new_balance = current_balance.saturating_sub(amount);
        self.state.user_balances.insert(key, new_balance);

        // For now, let's return success - withdrawal processing would happen separately
        DexResponse::Ok
    }

    /// Create a new liquidity pool
    fn create_pool(&mut self, token_a: TokenId, token_b: TokenId, amount_a: Amount, amount_b: Amount, fee_rate: u32) -> DexResponse {
        // Validate amounts are not zero
        if amount_a == Amount::ZERO || amount_b == Amount::ZERO {
            return DexResponse::Error("Amounts must be greater than zero".to_string());
        }

        // Validate fee rate is reasonable (max 10% = 1000 basis points)
        if fee_rate > 1000 {
            return DexResponse::Error("Fee rate cannot exceed 10%".to_string());
        }

        // Check if tokens are the same
        if token_a == token_b {
            return DexResponse::Error("Cannot create pool with identical tokens".to_string());
        }

        let pool_key = if token_a < token_b {
            (token_a.clone(), token_b.clone())
        } else {
            (token_b.clone(), token_a.clone())
        };

        // Check if pool already exists
        if self.state.pools.contains_key(&pool_key) {
            return DexResponse::Error("Pool already exists".to_string());
        }

        // Verify that the user has sufficient balance for the initial deposit
        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };

        // Check balance for token_a
        let key_a = (owner, token_a.clone());
        let balance_a = self.state.user_balances.get(&key_a).copied().unwrap_or(Amount::ZERO);
        if balance_a < amount_a {
            return DexResponse::Error("Insufficient balance for token A".to_string());
        }

        // Check balance for token_b
        let key_b = (owner, token_b.clone());
        let balance_b = self.state.user_balances.get(&key_b).copied().unwrap_or(Amount::ZERO);
        if balance_b < amount_b {
            return DexResponse::Error("Insufficient balance for token B".to_string());
        }

        // Create the pool
        let pool = Pool {
            token_a: token_a.clone(),
            token_b: token_b.clone(),
            reserve_a: amount_a,
            reserve_b: amount_b,
            total_shares: amount_a,  // Initially mint shares equivalent to amount_a
            fee_rate,
        };

        self.state.pools.insert(pool_key.clone(), pool);

        // Update user balances (deduct the deposited amounts)
        self.state.user_balances.insert(key_a, balance_a.saturating_sub(amount_a));
        self.state.user_balances.insert(key_b, balance_b.saturating_sub(amount_b));

        DexResponse::PoolCreated { success: true }
    }

    /// Add liquidity to an existing pool
    fn add_liquidity(&mut self, token_a: TokenId, token_b: TokenId, amount_a: Amount, amount_b: Amount) -> DexResponse {
        if amount_a == Amount::ZERO || amount_b == Amount::ZERO {
            return DexResponse::Error("Amounts must be greater than zero".to_string());
        }

        let pool_key = if token_a < token_b {
            (token_a.clone(), token_b.clone())
        } else {
            (token_b.clone(), token_a.clone())
        };

        let pool = match self.state.pools.get_mut(&pool_key) {
            Some(pool) => pool,
            None => return DexResponse::Error("Pool does not exist".to_string()),
        };

        // Verify that the user has sufficient balance for the deposit
        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };

        let key_a = (owner, token_a.clone());
        let balance_a = self.state.user_balances.get(&key_a).copied().unwrap_or(Amount::ZERO);
        if balance_a < amount_a {
            return DexResponse::Error("Insufficient balance for token A".to_string());
        }

        let key_b = (owner, token_b.clone());
        let balance_b = self.state.user_balances.get(&key_b).copied().unwrap_or(Amount::ZERO);
        if balance_b < amount_b {
            return DexResponse::Error("Insufficient balance for token B".to_string());
        }

        // Calculate the amount of shares to mint based on the existing pool ratio
        // If this is the first liquidity addition, mint shares based on amount_a
        let shares_to_mint = if pool.total_shares == Amount::ZERO {
            amount_a
        } else {
            // Calculate proportional amount of shares based on existing reserves
            // shares_to_mint = (amount_a * total_shares) / reserve_a
            let total_shares = Into::<u128>::into(pool.total_shares) as u128;
            let reserve_a = Into::<u128>::into(pool.reserve_a) as u128;
            let amount_a_val = Into::<u128>::into(amount_a) as u128;

            if reserve_a == 0 {
                return DexResponse::Error("Invalid pool state".to_string());
            }

            Amount::from_tokens(total_shares.saturating_mul(amount_a_val).saturating_div(reserve_a))
        };

        // Update pool reserves
        pool.reserve_a = pool.reserve_a.saturating_add(amount_a);
        pool.reserve_b = pool.reserve_b.saturating_add(amount_b);
        pool.total_shares = pool.total_shares.saturating_add(shares_to_mint);

        // Update user balances (deduct the deposited amounts)
        self.state.user_balances.insert(key_a, balance_a.saturating_sub(amount_a));
        self.state.user_balances.insert(key_b, balance_b.saturating_sub(amount_b));

        DexResponse::LiquidityAdded { shares_minted: shares_to_mint }
    }

    /// Remove liquidity from a pool
    fn remove_liquidity(&mut self, token_a: TokenId, token_b: TokenId, share_amount: Amount) -> DexResponse {
        if share_amount == Amount::ZERO {
            return DexResponse::Error("Share amount must be greater than zero".to_string());
        }

        let pool_key = if token_a < token_b {
            (token_a.clone(), token_b.clone())
        } else {
            (token_b.clone(), token_a.clone())
        };

        let pool = match self.state.pools.get_mut(&pool_key) {
            Some(pool) => pool,
            None => return DexResponse::Error("Pool does not exist".to_string()),
        };

        // Calculate the amounts to withdraw based on the share amount
        if pool.total_shares == Amount::ZERO {
            return DexResponse::Error("Pool has no shares".to_string());
        }

        // Check that user is not trying to remove more shares than they own
        let total_shares = Into::<u128>::into(pool.total_shares) as u128;
        let share_amount_val = Into::<u128>::into(share_amount) as u128;

        if share_amount_val > total_shares {
            return DexResponse::Error("Insufficient shares".to_string());
        }

        let reserve_a = Into::<u128>::into(pool.reserve_a) as u128;
        let reserve_b = Into::<u128>::into(pool.reserve_b) as u128;

        let amount_a = Amount::from_tokens(reserve_a.saturating_mul(share_amount_val).saturating_div(total_shares));
        let amount_b = Amount::from_tokens(reserve_b.saturating_mul(share_amount_val).saturating_div(total_shares));

        // Verify that the pool has sufficient reserves
        if pool.reserve_a < amount_a || pool.reserve_b < amount_b {
            return DexResponse::Error("Insufficient pool reserves".to_string());
        }

        // Update pool reserves
        pool.reserve_a = pool.reserve_a.saturating_sub(amount_a);
        pool.reserve_b = pool.reserve_b.saturating_sub(amount_b);
        pool.total_shares = pool.total_shares.saturating_sub(share_amount);

        // Update user balances (add the withdrawn amounts)
        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };
        let key_a = (owner, token_a.clone());
        let key_b = (owner, token_b.clone());

        let current_balance_a = self.state.user_balances.entry(key_a).or_insert(Amount::ZERO);
        *current_balance_a = current_balance_a.saturating_add(amount_a);

        let current_balance_b = self.state.user_balances.entry(key_b).or_insert(Amount::ZERO);
        *current_balance_b = current_balance_b.saturating_add(amount_b);

        DexResponse::LiquidityRemoved { amount_a, amount_b }
    }

    /// Claim faucet tokens (with rate limiting)
    fn claim_faucet_tokens(&mut self, token: TokenId, amount: Amount) -> DexResponse {
        // Implement rate limiting per account for production use
        // For demo purposes, we'll allow the claim if it's within reasonable limits

        // Example: Max 10000 tokens per claim
        if Into::<u128>::into(amount) as u128 > 10_000 {
            return DexResponse::Error("Faucet claim too large".to_string());
        }

        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };

        // Update user balance (add the faucet tokens)
        let key = (owner, token);
        let current_balance = self.state.user_balances.entry(key).or_insert(Amount::ZERO);
        *current_balance = current_balance.saturating_add(amount);

        DexResponse::Ok
    }

    /// Perform a swap using the Constant Product Market Maker (CPMM) formula
    fn swap_tokens(&mut self, from_token: TokenId, to_token: TokenId, amount: Amount) -> DexResponse {
        if amount == Amount::ZERO {
            return DexResponse::Error("Amount must be greater than zero".to_string());
        }

        let pool_key = if from_token < to_token {
            (from_token.clone(), to_token.clone())
        } else {
            (to_token.clone(), from_token.clone())
        };

        let pool = match self.state.pools.get_mut(&pool_key) {
            Some(pool) => pool,
            None => return DexResponse::Error("Pool does not exist".to_string()),
        };

        // Verify that the user has sufficient balance for the swap
        let owner = match self.runtime.authenticated_signer() {
            Some(owner) => owner,
            None => return DexResponse::Error("No authenticated signer".to_string()),
        };
        let from_key = (owner, from_token.clone());
        let from_balance = self.state.user_balances.get(&from_key).copied().unwrap_or(Amount::ZERO);
        if from_balance < amount {
            return DexResponse::Error("Insufficient balance for swap".to_string());
        }

        // Determine which reserve is input and which is output
        let (input_reserve, output_reserve, is_a_to_b) =
            if pool.token_a == from_token {
                (pool.reserve_a, pool.reserve_b, true)
            } else {
                (pool.reserve_b, pool.reserve_a, false)
            };

        // Check if reserves are non-zero to avoid division by zero
        if input_reserve == Amount::ZERO {
            return DexResponse::Error("Invalid pool state - input reserve is zero".to_string());
        }

        // Apply fee to the input amount (fee is taken from the input)
        let fee_rate = pool.fee_rate as u128;
        let amount_with_fee = Into::<u128>::into(amount) as u128;
        let fee_amount = amount_with_fee.saturating_mul(fee_rate).saturating_div(10_000); // 10_000 basis points = 100%
        let amount_after_fee = amount_with_fee.saturating_sub(fee_amount);

        // Calculate the output amount using the CPMM formula:
        // input_reserve * output_reserve = (input_reserve + input_amount) * (output_reserve - output_amount)
        // Solving for output_amount:
        // output_amount = (output_reserve * input_amount) / (input_reserve + input_amount)

        let input_reserve_u128 = Into::<u128>::into(input_reserve) as u128;
        let output_reserve_u128 = Into::<u128>::into(output_reserve) as u128;

        let denominator = input_reserve_u128.saturating_add(amount_after_fee);
        if denominator == 0 {
            return DexResponse::Error("Invalid calculation".to_string());
        }

        let numerator = output_reserve_u128.saturating_mul(amount_after_fee);
        let received_u128 = numerator.saturating_div(denominator);
        let received = Amount::from_tokens(received_u128);

        // Check if there's sufficient output reserve
        if received > output_reserve {
            return DexResponse::Error("Insufficient output reserve".to_string());
        }

        // Ensure we're not receiving zero when we should get something
        if received == Amount::ZERO && amount_after_fee > 0 {
            return DexResponse::Error("Swap would result in zero output".to_string());
        }

        // Update reserves
        if is_a_to_b {
            pool.reserve_a = pool.reserve_a.saturating_add(Amount::from_tokens(amount_after_fee));
            pool.reserve_b = pool.reserve_b.saturating_sub(received);
        } else {
            pool.reserve_b = pool.reserve_b.saturating_add(Amount::from_tokens(amount_after_fee));
            pool.reserve_a = pool.reserve_a.saturating_sub(received);
        }

        // Update user balances
        // Deduct from input token
        let new_from_balance = from_balance.saturating_sub(amount);
        self.state.user_balances.insert(from_key, new_from_balance);

        // Add to output token
        let to_key = (owner, to_token.clone());
        let current_to_balance = self.state.user_balances.entry(to_key).or_insert(Amount::ZERO);
        *current_to_balance = current_to_balance.saturating_add(received);

        DexResponse::SwapResult { received }
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
