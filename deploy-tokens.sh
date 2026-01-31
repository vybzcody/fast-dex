#!/bin/bash
# FastDEX Token Deployment Script
# This script publishes fungible modules and creates token applications

set -e  # Exit on error

echo "🚀 FastDEX Token Deployment"
echo "=============================="
echo ""

# Use same wallet configuration as deploy-to-conway.bash
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

# Configuration
WASM_DIR="/home/groot/Code/akindo/linera/linera-protocol/examples/target/wasm32-unknown-unknown/release"
OUTPUT_FILE="./token-config.json"

# Check if linera CLI is available
if ! command -v linera &> /dev/null; then
    echo "❌ Error: 'linera' command not found"
    echo "Please ensure Linera CLI is installed and in your PATH"
    exit 1
fi

# Check if wallet exists
if [ ! -f "$LINERA_WALLET" ]; then
    echo "❌ Error: Wallet not found at $LINERA_WALLET"
    echo "Please run './deploy-to-conway.bash' first to initialize the wallet"
    exit 1
fi

# Get current chain and owner
echo "📋 Getting wallet information..."
# Check for Default chain or Default owner to verify wallet is initialized
CHAIN_INFO=$(linera wallet show 2>/dev/null | grep -E "Default chain|Default owner" | head -1)
if [ -z "$CHAIN_INFO" ]; then
    echo "❌ Error: Wallet is not properly initialized"
    echo "Please run './deploy-to-conway.bash' first"
    exit 1
fi

# Extract Default owner address (handles multiple spaces)
OWNER=$(linera wallet show 2>/dev/null | grep "Default owner" | head -1 | awk '{print $NF}')
echo "✅ Owner: $OWNER"
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
echo ""

# Step 2: Publish native-fungible module
echo "📦 Step 2: Publishing native-fungible module..."
NATIVE_MODULE_ID=$(linera publish-module \
    "${WASM_DIR}/native_fungible_contract.wasm" \
    "${WASM_DIR}/native_fungible_service.wasm")

echo "✅ Native Module ID: $NATIVE_MODULE_ID"
echo ""

# Step 3: Create NAT token (native token wrapper)
echo "🪙 Step 3: Creating NAT token (Native Token Wrapper)..."
NAT_APP_ID=$(linera create-application "$NATIVE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"10000.\" } }" \
    --json-parameters '{ "ticker_symbol": "NAT" }')

echo "✅ NAT App ID: $NAT_APP_ID"
echo ""

# Step 4: Create USDC token
echo "🪙 Step 4: Creating USDC token..."
USDC_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"1000000.\" } }" \
    --json-parameters '{ "ticker_symbol": "USDC" }')

echo "✅ USDC App ID: $USDC_APP_ID"
echo ""

# Step 5: Create WETH token
echo "🪙 Step 5: Creating WETH token..."
WETH_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"1000.\" } }" \
    --json-parameters '{ "ticker_symbol": "WETH" }')

echo "✅ WETH App ID: $WETH_APP_ID"
echo ""

# Step 6: Create DAI token
echo "🪙 Step 6: Creating DAI token..."
DAI_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"500000.\" } }" \
    --json-parameters '{ "ticker_symbol": "DAI" }')

echo "✅ DAI App ID: $DAI_APP_ID"
echo ""

# Step 7: Save configuration
echo "💾 Step 7: Saving configuration..."
cat > "$OUTPUT_FILE" <<EOF
{
  "modules": {
    "fungible": "$FUNGIBLE_MODULE_ID",
    "native_fungible": "$NATIVE_MODULE_ID"
  },
  "base_token": {
    "app_id": "$NAT_APP_ID",
    "symbol": "NAT",
    "name": "Linera Native Token",
    "decimals": 18,
    "initial_supply": "10000"
  },
  "tokens": [
    {
      "app_id": "$USDC_APP_ID",
      "symbol": "USDC",
      "name": "USD Coin",
      "decimals": 6,
      "initial_supply": "1000000"
    },
    {
      "app_id": "$WETH_APP_ID",
      "symbol": "WETH",
      "name": "Wrapped Ethereum",
      "decimals": 18,
      "initial_supply": "1000"
    },
    {
      "app_id": "$DAI_APP_ID",
      "symbol": "DAI",
      "name": "Dai Stablecoin",
      "decimals": 18,
      "initial_supply": "500000"
    }
  ]
}
EOF

echo "✅ Configuration saved to: $OUTPUT_FILE"
echo ""

# Step 8: Create .env file for frontend
ENV_FILE="./frontend-amm/.env"
echo "📝 Step 8: Creating .env file for frontend..."
cat >> "$ENV_FILE" <<EOF

# Token Application IDs (Generated $(date))
REACT_APP_NAT_APP_ID=$NAT_APP_ID
REACT_APP_USDC_APP_ID=$USDC_APP_ID
REACT_APP_WETH_APP_ID=$WETH_APP_ID
REACT_APP_DAI_APP_ID=$DAI_APP_ID
REACT_APP_FUNGIBLE_MODULE_ID=$FUNGIBLE_MODULE_ID
EOF

echo "✅ Environment variables added to: $ENV_FILE"
echo ""

# Summary
echo "🎉 Deployment Complete!"
echo "=============================="
echo ""
echo "📋 Summary:"
echo "  • Fungible Module: $FUNGIBLE_MODULE_ID"
echo "  • Native Module: $NATIVE_MODULE_ID"
echo "  • NAT Token: $NAT_APP_ID"
echo "  • USDC Token: $USDC_APP_ID"
echo "  • WETH Token: $WETH_APP_ID"
echo "  • DAI Token: $DAI_APP_ID"
echo ""
echo "📄 Files Created:"
echo "  • $OUTPUT_FILE"
echo "  • $ENV_FILE (updated)"
echo ""
echo "✅ Next Steps:"
echo "  1. Review the configuration in $OUTPUT_FILE"
echo "  2. Test token balances with GraphQL queries"
echo "  3. Proceed to Phase 4: Migrate DEX Backend"
echo ""
