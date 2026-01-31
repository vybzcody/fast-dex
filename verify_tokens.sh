#!/bin/bash

# Config
PORT=8080
CHAIN_ID="fd2e3111a83bdd97f24b4175824436d8425aead1792048923caaa5df1429ca34"
OWNER="0x209b3a72c1e68305483cfcbea20fadee4f62ab3838cd01a72ffc9f517517ca11"

# App IDs
NAT_ID="6d61e3f2feba05ed354fd6b859c2b42f54d0029b252c87f909a0b8e7f03264e6"
USDC_ID="eccf97b75ebe39ee3ce68b5420396561ec7f79f45bc8ff2318c0bef5e91c37fd"
WETH_ID="b8301d04df71cbefe8e779889d7d1c66ba71e53f9bd9b786ebb034dcd5ff53e1"
DAI_ID="71637b6156dd68a5b5be390520cd629770a96dde100594d9182831dc79c65df3"

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

query_balance() {
    APP_ID=$1
    NAME=$2
    QUERY="query { accounts { entry(key: \"$OWNER\") { value } } }"
    
    # Run curl and capture exit code
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"query\": \"$QUERY\"}" \
        http://localhost:$PORT/chains/$CHAIN_ID/applications/$APP_ID || echo "CURL_ERROR")
        
    if [[ "$RESPONSE" == "CURL_ERROR" ]]; then
        echo "❌ $NAME: Connection failed (is service running?)"
    else
        VALUE=$(echo "$RESPONSE" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$VALUE" ]; then
             echo "❌ $NAME: Failed to parse balance. Raw response: $RESPONSE"
        else
             echo "✅ $NAME: $VALUE"
        fi
    fi
}

echo "🔎 Verifying Token Balances..."
echo "----------------------------------------"

query_balance "$NAT_ID" "NAT"
query_balance "$USDC_ID" "USDC"
query_balance "$WETH_ID" "WETH"
query_balance "$DAI_ID" "DAI"

echo "----------------------------------------"
echo "🧹 Cleaning up..."
kill $PID 2>/dev/null
echo "✨ Verification Complete"
