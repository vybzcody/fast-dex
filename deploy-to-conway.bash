#!/usr/bin/env bash
set -eu

# Deploy contract to Conway testnet and get App ID
export LINERA_WALLET="wallet.json"
export LINERA_STORAGE="rocksdb:client.db"
export LINERA_KEYSTORE="keystore.json"

# Clean up previous wallet
rm -f wallet.json keystore.json
rm -rf client.db

echo "Initializing wallet for Conway Testnet..."
linera wallet init --faucet https://faucet.testnet-conway.linera.net

echo "Syncing with testnet..."
linera sync

echo "Checking wallet status..."
linera wallet show

echo "Building contract..."
cargo build -p dex --release --target wasm32-unknown-unknown

echo "Publishing to Conway testnet..."
APP_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "null")

echo "App deployed to Conway testnet!"
echo "App ID: $APP_ID"
echo "Save this App ID for your frontend configuration"
