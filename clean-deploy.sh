#!/bin/bash
# Clean Token Deployment Script
# This script ensures a clean deployment with consistent IDs

set -e

echo "🧹 Clean Token Deployment"
echo "=========================="
echo ""

# Shared wallet config
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

# Check if wallet exists
if [ ! -f "$LINERA_WALLET" ]; then
    echo "❌ Error: Wallet not found at $LINERA_WALLET"
    echo "Please run a deployment script first to initialize the wallet"
    exit 1
fi

# Get current chain and owner info
echo "📋 Checking wallet status..."
CHAIN_ID=$(linera wallet show 2>/dev/null | grep "Chain ID:" | awk '{print $NF}')
OWNER_FROM_WALLET=$(linera wallet show 2>/dev/null | grep "Default owner:" | awk '{print $NF}')

echo "🔗 Current Chain ID: $CHAIN_ID"

# Handle owner extraction
if [ "$OWNER_FROM_WALLET" = "No" ] || [ "$OWNER_FROM_WALLET" = "owner" ] || [ -z "$OWNER_FROM_WALLET" ]; then
    OWNER=$(jq -r '.keys[0][0] // empty' keystore.json)
    if [ -z "$OWNER" ]; then
        echo "❌ No owner found in wallet or keystore!"
        exit 1
    fi
    echo "👤 Using owner from keystore: $OWNER"
else
    OWNER="$OWNER_FROM_WALLET"
    echo "👤 Using owner from wallet: $OWNER"
fi

# Check if WASM files exist
WASM_DIR="./target/wasm32-unknown-unknown/release"
if [ ! -f "${WASM_DIR}/fungible_contract.wasm" ]; then
    echo "❌ WASM files not found. Building..."
    echo "🔨 Building fungible token..."
    cd fungible && cargo build --release --target wasm32-unknown-unknown && cd ..
    echo "🔨 Building native-fungible token..."
    cd native-fungible && cargo build --release --target wasm32-unknown-unknown && cd ..
fi

echo ""
echo "🔄 Syncing with network..."
linera sync
echo "✅ Synced."
echo ""

# Step 1: Publish fungible module
echo "📦 Step 1: Publishing fungible module..."
FUNGIBLE_MODULE_ID=$(linera publish-module \
    "${WASM_DIR}/fungible_contract.wasm" \
    "${WASM_DIR}/fungible_service.wasm")
echo "✅ Fungible Module ID: $FUNGIBLE_MODULE_ID"

# Step 2: Publish native-fungible module  
echo "📦 Step 2: Publishing native-fungible module..."
NATIVE_MODULE_ID=$(linera publish-module \
    "${WASM_DIR}/native_fungible_contract.wasm" \
    "${WASM_DIR}/native_fungible_service.wasm")
echo "✅ Native Module ID: $NATIVE_MODULE_ID"

# Step 3: Create token applications
echo ""
echo "🪙 Step 3: Creating token applications..."

echo "🪙 Creating NAT (Native Token Wrapper)..."
NAT_APP_ID=$(linera create-application "$NATIVE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"10000.\" } }" \
    --json-parameters '{ "ticker_symbol": "NAT" }')
echo "✅ NAT App ID: $NAT_APP_ID"

echo "🪙 Creating USDC..."
USDC_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"1000000.\" } }" \
    --json-parameters '{ "ticker_symbol": "USDC" }')
echo "✅ USDC App ID: $USDC_APP_ID"

echo "🪙 Creating WETH..."
WETH_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"1000.\" } }" \
    --json-parameters '{ "ticker_symbol": "WETH" }')
echo "✅ WETH App ID: $WETH_APP_ID"

echo "🪙 Creating DAI..."
DAI_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"500000.\" } }" \
    --json-parameters '{ "ticker_symbol": "DAI" }')
echo "✅ DAI App ID: $DAI_APP_ID"

# Step 4: Save clean configuration
echo ""
echo "💾 Step 4: Saving clean configuration..."

# Create token-config.json
cat > "./token-config.json" <<EOF
{
  "chain_id": "$CHAIN_ID",
  "owner": "$OWNER",
  "modules": {
    "fungible": "$FUNGIBLE_MODULE_ID",
    "native_fungible": "$NATIVE_MODULE_ID"
  },
  "tokens": {
    "NAT": "$NAT_APP_ID",
    "USDC": "$USDC_APP_ID", 
    "WETH": "$WETH_APP_ID",
    "DAI": "$DAI_APP_ID"
  }
}
EOF
echo "✅ Configuration saved to: ./token-config.json"

# Create deployment environment file
cat > "./token_deployment.env" <<EOF
# Clean deployment $(date)
CHAIN_ID=$CHAIN_ID
OWNER=$OWNER
FUNGIBLE_MODULE_ID=$FUNGIBLE_MODULE_ID
NATIVE_MODULE_ID=$NATIVE_MODULE_ID
NAT_APP_ID=$NAT_APP_ID
USDC_APP_ID=$USDC_APP_ID
WETH_APP_ID=$WETH_APP_ID
DAI_APP_ID=$DAI_APP_ID
EOF
echo "✅ Environment saved to: ./token_deployment.env"

# Update frontend .env
if [ -d "./frontend-amm" ]; then
    echo "📝 Updating frontend .env..."
    cat >> "./frontend-amm/.env" <<EOF

# Clean Token Deployment $(date)
REACT_APP_CHAIN_ID=$CHAIN_ID
REACT_APP_OWNER=$OWNER
REACT_APP_NAT_APP_ID=$NAT_APP_ID
REACT_APP_USDC_APP_ID=$USDC_APP_ID
REACT_APP_WETH_APP_ID=$WETH_APP_ID
REACT_APP_DAI_APP_ID=$DAI_APP_ID
REACT_APP_FUNGIBLE_MODULE_ID=$FUNGIBLE_MODULE_ID
REACT_APP_NATIVE_MODULE_ID=$NATIVE_MODULE_ID
EOF
    echo "✅ Frontend environment updated"
fi

echo ""
echo "🎉 Clean Deployment Complete!"
echo "=============================="
echo ""
echo "📋 Summary:"
echo "  • Chain ID: $CHAIN_ID"
echo "  • Owner: $OWNER"
echo "  • Fungible Module: $FUNGIBLE_MODULE_ID"
echo "  • Native Module: $NATIVE_MODULE_ID"
echo "  • NAT Token: $NAT_APP_ID"
echo "  • USDC Token: $USDC_APP_ID"
echo "  • WETH Token: $WETH_APP_ID"
echo "  • DAI Token: $DAI_APP_ID"
echo ""
echo "✅ Next Steps:"
echo "  1. Test with: ./verify_tokens.sh"
echo "  2. Start frontend: cd frontend-amm && npm run dev"
echo ""
