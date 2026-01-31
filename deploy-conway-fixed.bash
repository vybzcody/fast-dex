#!/usr/bin/env bash
set -eu

# Clean slate approach for Conway testnet
rm -rf ~/.config/linera wallet.json keystore.json client.db 2>/dev/null || true

# Initialize with faucet (creates chain automatically)
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Sync to ensure chain is ready
linera sync

# Build contract
cargo build -p dex --release --target wasm32-unknown-unknown

# Deploy (wallet init should have set default chain)
APP_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "null")

echo "Deployed to Conway! App ID: $APP_ID"

# Start service for frontend
linera service --port 8081 &

# Configure frontend
cat > frontend-amm/public/config.json <<EOF
{"appId": "$APP_ID"}
EOF

cd frontend-amm && npm run dev -- --port 5173 --host 0.0.0.0
