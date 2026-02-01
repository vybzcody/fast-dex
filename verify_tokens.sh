#!/bin/bash

# Shared wallet config (MUST match deployment scripts)
export LINERA_WALLET="$PWD/wallet.json"
export LINERA_STORAGE="rocksdb:$PWD/client.db"
export LINERA_KEYSTORE="$PWD/keystore.json"

# Config (extracted from token-config.json and wallet)
PORT=8080

# Read configuration from token-config.json
if [ ! -f "token-config.json" ]; then
    echo "❌ token-config.json not found! Run clean deployment first."
    exit 1
fi

# Try to get chain_id and owner from config file first
CHAIN_ID=$(jq -r '.chain_id // empty' token-config.json)
OWNER=$(jq -r '.owner // empty' token-config.json)

# Fallback to wallet if not in config
if [ -z "$CHAIN_ID" ]; then
    CHAIN_ID=$(linera wallet show 2>/dev/null | grep "Chain ID:" | awk '{print $NF}')
fi

if [ -z "$OWNER" ]; then
    OWNER_FROM_WALLET=$(linera wallet show 2>/dev/null | grep "Default owner:" | awk '{print $NF}')
    if [ "$OWNER_FROM_WALLET" = "No" ] || [ "$OWNER_FROM_WALLET" = "owner" ] || [ -z "$OWNER_FROM_WALLET" ]; then
        OWNER=$(jq -r '.keys[0][0] // empty' keystore.json)
        if [ -z "$OWNER" ]; then
            echo "❌ No owner found in config, wallet, or keystore!"
            exit 1
        fi
        echo "ℹ️  Using owner from keystore: $OWNER"
    else
        OWNER="$OWNER_FROM_WALLET"
        echo "ℹ️  Using owner from wallet: $OWNER"
    fi
else
    echo "ℹ️  Using owner from config: $OWNER"
fi

echo "ℹ️  Using chain ID: $CHAIN_ID"

# Read App IDs from token-config.json
NAT_ID=$(jq -r '.tokens.NAT' token-config.json)
USDC_ID=$(jq -r '.tokens.USDC' token-config.json)
WETH_ID=$(jq -r '.tokens.WETH' token-config.json)
DAI_ID=$(jq -r '.tokens.DAI' token-config.json)

if [ -z "$NAT_ID" ] || [ "$NAT_ID" = "null" ]; then
    echo "❌ Invalid token configuration! Run clean deployment first."
    exit 1
fi

# Kill any existing service on this port
fuser -k $PORT/tcp 2>/dev/null || true

echo "🔄 Starting Linera Service on port $PORT..."
linera service --port $PORT > /dev/null 2>&1 &
PID=$!

# Wait for service to be ready
echo "⏳ Waiting for service to start..."
for i in {1..10}; do
    if curl -s http://localhost:$PORT > /dev/null; then
        echo "✅ Service is UP!"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

query_native_balance() {
    APP_ID=$1
    NAME=$2
    
    # Try different queries for native fungible tokens
    echo "🔍 Testing $NAME with different queries..."
    
    # Test 1: Simple ticker query first
    TICKER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"query": "query { tickerSymbol }"}' \
        http://localhost:$PORT/chains/$CHAIN_ID/applications/$APP_ID || echo "CURL_ERROR")
    
    if [[ "$TICKER_RESPONSE" == "CURL_ERROR" ]]; then
        echo "❌ $NAME: Connection failed (is service running?)"
        return
    fi
    
    TICKER=$(echo "$TICKER_RESPONSE" | jq -r '.data.tickerSymbol // empty' 2>/dev/null)
    if [ -n "$TICKER" ] && [ "$TICKER" != "null" ]; then
        echo "✅ $NAME: Service responding (ticker: $TICKER)"
        
        # Test 2: Try accounts keys
        KEYS_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
            -d '{"query": "query { accounts { keys } }"}' \
            http://localhost:$PORT/chains/$CHAIN_ID/applications/$APP_ID || echo "CURL_ERROR")
        
        KEYS=$(echo "$KEYS_RESPONSE" | jq -r '.data.accounts.keys // []' 2>/dev/null)
        echo "ℹ️  $NAME: Available keys: $KEYS"
        
        # Test 3: Try to get balance
        BALANCE_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"query\": \"query { accounts { entry(key: \\\"$OWNER\\\") { value } } }\"}" \
            http://localhost:$PORT/chains/$CHAIN_ID/applications/$APP_ID || echo "CURL_ERROR")
        
        VALUE=$(echo "$BALANCE_RESPONSE" | jq -r '.data.accounts.entry.value // empty' 2>/dev/null)
        if [ -n "$VALUE" ] && [ "$VALUE" != "null" ]; then
            echo "✅ $NAME: $VALUE"
        else
            echo "✅ $NAME: 0 (no balance found)"
        fi
    else
        echo "❌ $NAME: Service not responding properly. Raw: $TICKER_RESPONSE"
    fi
}

query_fungible_balance() {
    APP_ID=$1
    NAME=$2
    # Regular fungible tokens use MapView schema - try different approaches
    
    # First try: direct entry lookup
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"query\": \"query { accounts { entry(key: \\\"$OWNER\\\") } }\"}" \
        http://localhost:$PORT/chains/$CHAIN_ID/applications/$APP_ID || echo "CURL_ERROR")
        
    if [[ "$RESPONSE" == "CURL_ERROR" ]]; then
        echo "❌ $NAME: Connection failed"
        return
    fi
    
    VALUE=$(echo "$RESPONSE" | jq -r '.data.accounts.entry // empty' 2>/dev/null)
    if [ -n "$VALUE" ] && [ "$VALUE" != "null" ] && [ "$VALUE" != "" ]; then
        echo "✅ $NAME: $VALUE"
        return
    fi
    
    # Second try: get all entries and find our owner
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"query": "query { accounts { entries { key value } } }"}' \
        http://localhost:$PORT/chains/$CHAIN_ID/applications/$APP_ID || echo "CURL_ERROR")
    
    ENTRIES=$(echo "$RESPONSE" | jq -r '.data.accounts.entries // []' 2>/dev/null)
    if [ "$ENTRIES" != "[]" ] && [ "$ENTRIES" != "null" ]; then
        # Find our owner in the entries
        OUR_BALANCE=$(echo "$RESPONSE" | jq -r ".data.accounts.entries[] | select(.key == \"$OWNER\") | .value" 2>/dev/null)
        if [ -n "$OUR_BALANCE" ] && [ "$OUR_BALANCE" != "null" ]; then
            echo "✅ $NAME: $OUR_BALANCE"
        else
            echo "✅ $NAME: 0 (owner not found in entries)"
        fi
    else
        echo "✅ $NAME: 0 (no entries found)"
    fi
}

echo "🔎 Verifying Token Balances..."
echo "----------------------------------------"

# NAT is native-fungible, others are regular fungible
query_native_balance "$NAT_ID" "NAT"
query_fungible_balance "$USDC_ID" "USDC"
query_fungible_balance "$WETH_ID" "WETH"
query_fungible_balance "$DAI_ID" "DAI"

echo "----------------------------------------"
echo "🧹 Cleaning up..."
kill $PID 2>/dev/null
echo "✨ Verification Complete"
