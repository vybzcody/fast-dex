#!/usr/bin/env bash
set -eu

# check dependencies
command -v linera >/dev/null 2>&1 || { echo >&2 "Linera CLI required but not installed. Aborting."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo >&2 "Cargo required but not installed. Aborting."; exit 1; }

# Set local paths for Linera state to avoid conflicts with global config
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

echo "🔨 Building DEX contract..."
cargo build -p dex --release --target wasm32-unknown-unknown

# Check if wallet exists, if not init
# Check if wallet exists and is valid
if [ -f "$LINERA_WALLET" ]; then
    echo "🔑 Checking existing local wallet..."
    # Temporarily disable exit-on-error to check wallet status
    set +e
    OUTPUT=$(linera wallet show 2>&1)
    if echo "$OUTPUT" | grep -q "Default chain"; then
        echo "✅ Wallet is valid and has a default chain."
    else
        echo "⚠️ Wallet exists but has no default chain. Resetting..."
        rm -f "$LINERA_WALLET" "$LINERA_KEYSTORE"
        rm -rf "$PWD/client.db"
    fi
fi

if [ ! -f "$LINERA_WALLET" ]; then
    echo "🔑 Initializing new local wallet for Conway Testnet..."
    # Clean up any partial state to avoid errors
    rm -f "$LINERA_KEYSTORE"
    rm -rf "$PWD/client.db"
    
    linera wallet init --faucet https://faucet.testnet-conway.linera.net
    echo "🔗 Requesting chain from faucet..."
    linera wallet request-chain --faucet https://faucet.testnet-conway.linera.net
fi

echo "🔄 Syncing with network..."
linera sync

echo "🚀 Publishing and creating application..."
APP_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "null")

echo "✅ App Deployed! ID: $APP_ID"

# Ensure directory exists
mkdir -p frontend-amm/public

echo "📝 Updating frontend configuration..."
cat > frontend-amm/public/config.json <<EOF
{
  "appId": "$APP_ID",
  "network": "conway",
  "faucetUrl": "https://faucet.testnet-conway.linera.net"
}
EOF

echo "🎉 Success! The frontend is now configured with the new App ID."
echo "👉 Run 'cd frontend-amm && npm run dev' to test locally."
echo "👉 For production, commit 'frontend-amm/public/config.json' and deploy to Netlify."
