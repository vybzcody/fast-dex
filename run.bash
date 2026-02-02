#!/usr/bin/env bash
set -eu

echo "🚀 Setting up local Linera network with Ethereum support..."

# Use buildathon template format for guaranteed compatibility
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

echo "🔨 Building contracts..."
cargo build -p bridge-tracker --release --target wasm32-unknown-unknown
cargo build -p dex --release --target wasm32-unknown-unknown

echo "🌉 Deploying bridge tracker..."
BRIDGE_TRACKER_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/bridge_tracker_{contract,service}.wasm \
  --json-argument '{
    "ethereum_endpoint": "http://localhost:8545",
    "bridge_contract": "0x7449478525Eb5106f487d44672B40592Af2a4E49",
    "usdc_contract": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "start_block": 0
  }')

echo "🏪 Deploying DEX..."
DEX_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "{\"bridge_tracker_app\": \"$BRIDGE_TRACKER_ID\"}")

echo "✅ Bridge Tracker: $BRIDGE_TRACKER_ID"
echo "✅ DEX: $DEX_ID"

# Start service
echo "🔄 Starting Linera service..."
linera service --port 8081 &

# Generate frontend config
echo "📝 Configuring frontend..."
mkdir -p frontend-amm/public
cat > frontend-amm/public/config.json <<EOF
{
  "dexAppId": "$DEX_ID",
  "bridgeTrackerAppId": "$BRIDGE_TRACKER_ID",
  "rpcUrl": "http://localhost:8081",
  "network": "local",
  "faucetUrl": "http://localhost:8080"
}
EOF

# Build and run frontend
echo "🌐 Starting frontend..."
cd frontend-amm
npm install
npm run dev -- --port 5173 --host 0.0.0.0
