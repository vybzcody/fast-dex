#!/bin/bash
# Step 1: Publish Fungible Module
set -e

echo "🚀 Step 1: Publishing Fungible Module"
echo "===================================="

# Shared wallet config
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

WASM_DIR="./target/wasm32-unknown-unknown/release"
ENV_FILE="token_deployment.env"

# Check wallet
if [ ! -f "$LINERA_WALLET" ]; then
    echo "❌ Error: Wallet not found. Run ./deploy-to-conway.bash first."
    exit 1
fi

echo "🔄 Syncing..."
linera sync
echo "✅ Synced."

echo "📦 Publishing fungible module..."
FUNGIBLE_MODULE_ID=$(linera publish-module \
    "${WASM_DIR}/fungible_contract.wasm" \
    "${WASM_DIR}/fungible_service.wasm")

echo "✅ Published! ID: $FUNGIBLE_MODULE_ID"

# Save to env file
echo "FUNGIBLE_MODULE_ID=$FUNGIBLE_MODULE_ID" > "$ENV_FILE"
echo "💾 Saved ID to $ENV_FILE"

echo ""
echo "👉 Next: Run ./deploy-step2-publish-native.sh"
