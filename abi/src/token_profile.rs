use async_graphql_derive::SimpleObject;
use linera_sdk::linera_base_types::Amount;
use serde::{Deserialize, Serialize};

#[derive(
    Debug, Clone, Default, Deserialize, Eq, Ord, PartialOrd, PartialEq, Serialize, SimpleObject,
)]
pub struct TokenAmount {
    pub amount: Amount,
    pub text: String,
    pub enable: bool,
}

#[derive(
    Debug, Clone, Default, Deserialize, Eq, Ord, PartialOrd, PartialEq, Serialize, SimpleObject,
)]
pub struct LiquidityData {
    pub min_amount: Amount,
    pub max_amount: Amount,
    pub suggested_amounts: Option<[TokenAmount; 5]>,
}

#[derive(
    Debug, Clone, Default, Deserialize, Eq, Ord, PartialOrd, PartialEq, Serialize, SimpleObject,
)]
pub struct UserProfile {
    pub balance: Amount,
    pub liquidity_data: Option<LiquidityData>,
}

impl UserProfile {
    pub fn update_balance(&mut self, amount: Amount) {
        self.balance = amount
    }

    pub fn calculate_liquidity_data(&mut self) {
        // Minimum base value (smallest suggested amount)
        let mut base = Amount::from_tokens(100);

        // Handle balances below the minimum
        if self.balance < base {
            self.liquidity_data = Some(LiquidityData {
                min_amount: Amount::ZERO,
                max_amount: self.balance,
                suggested_amounts: None,
            });
            return;
        }

        // Calculate the appropriate base level
        while self.balance >= base.try_mul(500).unwrap_or(Amount::MAX) {
            let next_base = base.try_mul(10).unwrap_or(Amount::ZERO);
            if next_base.is_zero() {
                break;
            } else {
                base = next_base;
            }
        }

        // Generate suggested amount denominations
        let denominations = [
            base,                     // 1x
            base.saturating_mul(5),   // 5x
            base.saturating_mul(25),  // 25x
            base.saturating_mul(100), // 100x
            base.saturating_mul(250), // 250x
        ];

        // Generate suggested amount list
        let suggested_amount_list = [
            TokenAmount {
                amount: denominations[0],
                text: format_amount_units(
                    denominations[0].saturating_div(Amount::ONE.into()).into(),
                ),
                enable: denominations[0] <= self.balance,
            },
            TokenAmount {
                amount: denominations[1],
                text: format_amount_units(
                    denominations[1].saturating_div(Amount::ONE.into()).into(),
                ),
                enable: denominations[1] <= self.balance,
            },
            TokenAmount {
                amount: denominations[2],
                text: format_amount_units(
                    denominations[2].saturating_div(Amount::ONE.into()).into(),
                ),
                enable: denominations[2] <= self.balance,
            },
            TokenAmount {
                amount: denominations[3],
                text: format_amount_units(
                    denominations[3].saturating_div(Amount::ONE.into()).into(),
                ),
                enable: denominations[3] <= self.balance,
            },
            TokenAmount {
                amount: denominations[4],
                text: format_amount_units(
                    denominations[4].saturating_div(Amount::ONE.into()).into(),
                ),
                enable: denominations[4] <= self.balance,
            },
        ];

        self.liquidity_data = Some(LiquidityData {
            min_amount: denominations[0], // Smallest denomination
            max_amount: self.balance,     // User's full balance
            suggested_amounts: Some(suggested_amount_list),
        })
    }

    pub fn clear_liquidity_data(&mut self) {
        self.liquidity_data = None
    }
}

pub fn format_amount_units(value: u128) -> String {
    if value < 1000 {
        return value.to_string();
    }

    const SUFFIXES: [(&str, u128); 11] = [
        ("D", 1_000_000_000_000_000_000_000_000_000_000_000), // 10^33
        ("N", 1_000_000_000_000_000_000_000_000_000_000),     // 10^30
        ("O", 1_000_000_000_000_000_000_000_000_000),         // 10^27
        ("Sp", 1_000_000_000_000_000_000_000_000),            // 10^24
        ("S", 1_000_000_000_000_000_000_000),                 // 10^21
        ("Qi", 1_000_000_000_000_000_000),                    // 10^18
        ("Q", 1_000_000_000_000_000),                         // 10^15
        ("T", 1_000_000_000_000),                             // 10^12
        ("B", 1_000_000_000),                                 // 10^9
        ("M", 1_000_000),                                     // 10^6
        ("K", 1_000),                                         // 10^3
    ];

    for &(suffix, divisor) in SUFFIXES.iter() {
        if value >= divisor {
            let scaled = value as f64 / divisor as f64;
            // Handle values that round up to 1000
            if scaled >= 999.95 {
                // Try next higher suffix
                if let Some(&(next_suffix, next_divisor)) = SUFFIXES.get(
                    SUFFIXES.len() - SUFFIXES.iter().position(|&s| s.1 == divisor).unwrap() - 1,
                ) {
                    let next_scaled = value as f64 / next_divisor as f64;
                    return format_amount_float(next_scaled, next_suffix);
                }
            }
            return format_amount_float(scaled, suffix);
        }
    }

    value.to_string()
}

fn format_amount_float(value: f64, suffix: &str) -> String {
    // Round to the nearest tenth
    let rounded = (value * 10.0).round() / 10.0;

    if rounded.fract() == 0.0 {
        format!("{:.0}{}", rounded, suffix)
    } else {
        let s = format!("{:.1}", rounded);
        s.trim_end_matches('0').trim_end_matches('.').to_string() + suffix
    }
}
