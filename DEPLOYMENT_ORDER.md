# FastDEX Deployment Order

## Complete Deployment Sequence

### 1. EVM Contracts (First)
```bash
cd solidity-contracts
npm install
npm run deploy:sepolia
npm run deploy:arbitrum-sepolia
```
**Output**: Bridge contract addresses for each network

### 2. Linera Bridge Tracker
```bash
# Update bridge contract addresses in deploy script
BRIDGE_TRACKER_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/bridge_tracker_{contract,service}.wasm \
  --json-argument '{
    "ethereum_endpoint": "https://sepolia.infura.io/v3/YOUR_KEY",
    "bridge_contract": "0x[SEPOLIA_BRIDGE_ADDRESS]",
    "usdc_contract": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "start_block": [DEPLOYMENT_BLOCK]
  }')
```

### 3. Linera DEX
```bash
DEX_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/dex_{contract,service}.wasm \
  --json-argument "{\"bridge_tracker_app\": \"$BRIDGE_TRACKER_ID\"}")
```

### 4. Frontend Configuration
```bash
# Update frontend-amm/public/config.json
{
  "dexAppId": "$DEX_ID",
  "bridgeTrackerAppId": "$BRIDGE_TRACKER_ID",
  "bridgeContracts": {
    "sepolia": "0x[SEPOLIA_BRIDGE_ADDRESS]",
    "arbitrumSepolia": "0x[ARBITRUM_SEPOLIA_BRIDGE_ADDRESS]"
  }
}
```

## Automated Deployment
```bash
# Deploy everything in correct order
./deploy-bridge-dex.bash
```

## Dependencies
- EVM contracts → Bridge Tracker (needs contract addresses)
- Bridge Tracker → DEX (needs bridge tracker app ID)
- Frontend → All (needs all app IDs and contract addresses)
