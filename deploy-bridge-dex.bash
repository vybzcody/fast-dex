#!/usr/bin/env bash
set -eu

# check dependencies
command -v linera >/dev/null 2>&1 || { echo >&2 "Linera CLI required but not installed. Aborting."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo >&2 "Cargo required but not installed. Aborting."; exit 1; }

# Set local paths for Linera state to avoid conflicts with global config
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

echo "🔨 Building bridge tracker and DEX contracts..."
cargo build -p bridge-tracker --release --target wasm32-unknown-unknown
cargo build -p dex --release --target wasm32-unknown-unknown

# Check if wallet exists and is valid
if [ -f "$LINERA_WALLET" ]; then
    echo "🔑 Checking existing local wallet..."
    set +e
    OUTPUT=$(linera wallet show 2>&1)
    if echo "$OUTPUT" | grep -q "Default chain"; then
        echo "✅ Wallet is valid and has a default chain."
        set -e
    else
        echo "⚠️ Wallet exists but has no default chain. Resetting..."
        rm -f "$LINERA_WALLET" "$LINERA_KEYSTORE"
        rm -rf "$PWD/client.db"
        set -e
    fi
else
    set -e
fi

if [ ! -f "$LINERA_WALLET" ]; then
    echo "🔑 Initializing new local wallet for Conway Testnet..."
    rm -f "$LINERA_KEYSTORE"
    rm -rf "$PWD/client.db"
    
    linera wallet init --faucet https://faucet.testnet-conway.linera.net
    echo "🔗 Requesting chain from faucet..."
    linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
fi

echo "🔄 Syncing with network..."
linera sync

echo "🌉 Deploying bridge tracker with Sepolia configuration..."
BRIDGE_TRACKER_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/bridge_tracker_{contract,service}.wasm \
  --json-argument '{
    "ethereum_endpoint": "https://sepolia.infura.io/v3/YOUR_KEY",
    "bridge_contract": "0x7449478525Eb5106f487d44672B40592Af2a4E49",
    "usdc_contract": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "start_block": 0
  }')

echo "✅ Bridge Tracker Deployed! ID: $BRIDGE_TRACKER_ID"

echo "🏪 Deploying DEX with bridge tracker reference..."
DEX_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "{\"bridge_tracker_app\": \"$BRIDGE_TRACKER_ID\"}")

echo "✅ DEX Deployed! ID: $DEX_ID"

# Ensure directory exists
mkdir -p frontend-amm/public

echo "📝 Updating frontend configuration..."
cat > frontend-amm/public/config.json <<EOF
{
  "dexAppId": "$DEX_ID",
  "bridgeTrackerAppId": "$BRIDGE_TRACKER_ID",
  "network": "conway",
  "faucetUrl": "https://faucet.testnet-conway.linera.net",
  "bridgeContracts": {
    "sepolia": "0x7449478525Eb5106f487d44672B40592Af2a4E49"
  }
}
EOF

echo "🎉 Success! Both applications deployed and frontend configured."
echo "👉 Bridge Tracker: $BRIDGE_TRACKER_ID"
echo "👉 DEX: $DEX_ID"
echo "👉 Run 'cd frontend-amm && npm run dev' to test locally."
echo "👉 Deploy Solidity contracts and update bridge addresses in config.json"
