#!/bin/bash
# Step 2: Publish Native Fungible Module
set -e

echo "🚀 Step 2: Publishing Native Fungible Module"
echo "============================================"

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

echo "📦 Publishing native-fungible module..."
NATIVE_MODULE_ID=$(linera publish-module \
    "${WASM_DIR}/native_fungible_contract.wasm" \
    "${WASM_DIR}/native_fungible_service.wasm")

echo "✅ Published! ID: $NATIVE_MODULE_ID"

# Append to env file
echo "NATIVE_MODULE_ID=$NATIVE_MODULE_ID" >> "$ENV_FILE"
echo "💾 Saved ID to $ENV_FILE"

echo ""
echo "👉 Next: Run ./deploy-step3-create-tokens.sh"
