#!/usr/bin/env bash
set -eu

# Use buildathon template format for guaranteed compatibility
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

# Build and publish backend
echo "Building DEX contract..."
cargo build -p dex --release --target wasm32-unknown-unknown

echo "Publishing DEX to local network..."
APP_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "null")

echo "DEX App ID: $APP_ID"

# Start service
echo "Starting Linera service..."
linera service --port 8081 &

# Generate frontend config
echo "Configuring frontend..."
cat > frontend-amm/public/config.json <<EOF
{
  "appId": "$APP_ID",
  "rpcUrl": "http://localhost:8081"
}
EOF

# Build and run frontend
echo "Starting frontend..."
cd frontend-amm
npm run dev -- --port 5173 --host 0.0.0.0
