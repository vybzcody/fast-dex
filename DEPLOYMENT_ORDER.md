# Deployment Order for FastDEX

Follow these steps to deploy FastDEX with fungible tokens:

## Prerequisites

- Linera CLI v0.15.8+ installed
- Rust with `wasm32-unknown-unknown` target
- Internet connection for Conway testnet

## Step 1: Build Project

```bash
cd /home/groot/Code/akindo/linera/fast-dex
cargo build --release --target wasm32-unknown-unknown
```

## Step 2: Deploy DEX Contract

```bash
./deploy-to-conway.bash
```
**Creates**: DEX application + wallet files

## Step 3: Deploy Tokens

```bash
./deploy-tokens.sh
```
**Creates**: NAT, USDC, WETH, DAI tokens + `token-config.json`

## Step 4: Verify Deployment

```bash
./verify_tokens.sh
```
**Expected output**:
```
✅ NAT: 0.
✅ USDC: 0
✅ WETH: 0
✅ DAI: 0
```

## Clean Deployment (if needed)

```bash
./clean-deploy.sh
```

## Files Created

- `wallet.json`, `keystore.json`, `client.db/` - Wallet data
- `token-config.json` - Token app IDs and chain info
- `frontend-amm/.env` - Frontend configuration
