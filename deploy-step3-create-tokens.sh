#!/bin/bash
# Step 3: Create Token Applications
set -e

echo "🚀 Step 3: Creating Token Applications"
echo "======================================"

# Shared wallet config
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

ENV_FILE="token_deployment.env"
OUTPUT_FILE="./token-config.json"
FRONTEND_ENV="./frontend-amm/.env"

# Load module IDs
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    echo "❌ Error: $ENV_FILE not found. Run steps 1 and 2 first."
    exit 1
fi

if [ -z "$FUNGIBLE_MODULE_ID" ] || [ -z "$NATIVE_MODULE_ID" ]; then
    echo "❌ Error: Module IDs missing in $ENV_FILE."
    exit 1
fi

echo "📋 Using Fungible Module: $FUNGIBLE_MODULE_ID"
echo "📋 Using Native Module:   $NATIVE_MODULE_ID"

# Get Owner
OWNER=$(linera wallet show 2>/dev/null | grep "Default owner" | head -1 | awk '{print $NF}')
echo "👤 Owner: $OWNER"
echo ""

# Create Tokens
echo "🪙 Creating NAT (Native Wrapper)..."
NAT_APP_ID=$(linera create-application "$NATIVE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"10.\" } }" \
    --json-parameters '{ "ticker_symbol": "NAT" }')
echo "✅ NAT: $NAT_APP_ID"

echo "🪙 Creating USDC..."
USDC_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"1000000.\" } }" \
    --json-parameters '{ "ticker_symbol": "USDC" }')
echo "✅ USDC: $USDC_APP_ID"

echo "🪙 Creating WETH..."
WETH_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"1000.\" } }" \
    --json-parameters '{ "ticker_symbol": "WETH" }')
echo "✅ WETH: $WETH_APP_ID"

echo "🪙 Creating DAI..."
DAI_APP_ID=$(linera create-application "$FUNGIBLE_MODULE_ID" \
    --json-argument "{ \"accounts\": { \"$OWNER\": \"500000.\" } }" \
    --json-parameters '{ "ticker_symbol": "DAI" }')
echo "✅ DAI: $DAI_APP_ID"

# Save Config
echo "💾 Saving configuration..."
cat > "$OUTPUT_FILE" <<EOF
{
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
echo "✅ Saved to $OUTPUT_FILE"

# Update Frontend
echo "📝 Updating frontend .env..."
cat >> "$FRONTEND_ENV" <<EOF

# Token App IDs (Generated $(date))
REACT_APP_NAT_APP_ID=$NAT_APP_ID
REACT_APP_USDC_APP_ID=$USDC_APP_ID
REACT_APP_WETH_APP_ID=$WETH_APP_ID
REACT_APP_DAI_APP_ID=$DAI_APP_ID
REACT_APP_FUNGIBLE_MODULE_ID=$FUNGIBLE_MODULE_ID
EOF
echo "✅ Updated $FRONTEND_ENV"

echo ""
echo "🎉 All Done!"
