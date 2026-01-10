#!/usr/bin/env bash
set -eu

# Configuration
LINERA_NET_PORT=8080
SERVICE_PORT=8081
FRONTEND_PORT=5173
TMP_DIR="target/amm-tmp"

# Cleanup previous run
# Cleanup previous run
# rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# Aggressive Port Cleanup
echo "Cleaning up ports $LINERA_NET_PORT, $SERVICE_PORT, $FRONTEND_PORT..."
fuser -k $SERVICE_PORT/tcp || true
fuser -k $FRONTEND_PORT/tcp || true
sleep 1

# Local Net (Commented out for Testnet)
# echo "Starting Linera Net..."
# source /dev/stdin <<<"$(linera net helper 2>/dev/null)"
# linera_spawn linera net up --initial-amount 1000000000 --with-faucet --faucet-port $LINERA_NET_PORT
# sleep 5

# Setup Wallet 1
export LINERA_WALLET="$TMP_DIR/wallet_1.json"
export LINERA_STORAGE="rocksdb:$TMP_DIR/client_1.db"
export LINERA_KEYSTORE="$TMP_DIR/keystore_1.json"

if [ -f "$LINERA_WALLET" ]; then
    echo "Wallet already exists. Checking chains..."
    # Check if wallet has any chains
    if ! linera wallet show 2>/dev/null | grep -q "Chain ID"; then
        echo "No chains found. Requesting new chain from testnet..."
        linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
    fi
else
    echo "Initializing Wallet for Conway Testnet..."
    # Connect to Conway Testnet and request a chain
    linera wallet init --faucet https://faucet.testnet-conway.linera.net
    linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
fi

if [ -f "$LINERA_WALLET" ]; then
    echo "Wallet already exists. Checking chains..."
    # Check if wallet has any chains using --short option
    CHAINS=$(linera wallet show --short 2>/dev/null || echo "")
    if [ -z "$CHAINS" ]; then
        echo "No chains found. Requesting new chain from testnet..."
        linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
    else
        echo "Found existing chains: $CHAINS"
    fi
else
    echo "Initializing Wallet for Conway Testnet..."
    # Connect to Conway Testnet and request a chain
    linera wallet init --faucet https://faucet.testnet-conway.linera.net
    linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
fi

echo "Syncing with testnet..."
linera sync && linera query-balance

# Get the first chain ID as default
DEFAULT_CHAIN=$(linera wallet show --short | head -1)
if [ -z "$DEFAULT_CHAIN" ]; then
    echo "Error: No chains found in wallet"
    exit 1
fi

# Set as default chain if not already set
linera wallet set-default "$DEFAULT_CHAIN" 2>/dev/null || true
echo "Default Chain: $DEFAULT_CHAIN"

# Build and Publish DEX
echo "Building and Publishing DEX..."
# Ensure we are building the workspace or specific crate
cargo build -p dex --release --target wasm32-unknown-unknown

APP_ID=$(linera project publish-and-create . dex --json-argument "null")
echo "DEX App ID: $APP_ID"

# Start Service
echo "Starting Node Service on port $SERVICE_PORT..."
linera service --port $SERVICE_PORT &
SERVICE_PID=$!
echo "Service PID: $SERVICE_PID"

# Generate Config for Frontend
echo "Generating frontend config..."
cat > frontend-amm/public/config.json <<EOF
{
  "nodeUrl": "http://localhost:$SERVICE_PORT",
  "chainId": "$DEFAULT_CHAIN",
  "appId": "$APP_ID"
}
EOF

# Run Frontend
echo "Starting Frontend..."
cd frontend-amm
npm run dev -- --port $FRONTEND_PORT &
FRONTEND_PID=$!

echo "DEX Deployment Complete!"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Press Ctrl+C to stop"

trap "kill $SERVICE_PID $FRONTEND_PID; exit" INT TERM
wait
