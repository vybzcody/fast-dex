# FastDEX Deployment Order

## Complete Deployment Sequence

### 1. EVM Contracts (First) - Using Remix
1. Open [Remix IDE](https://remix.ethereum.org)
2. Upload `solidity-contracts/contracts/FastDEXBridge.sol`
3. Compile with Solidity 0.8.19+
4. Deploy to **Sepolia Testnet**:
   - Connect MetaMask to Sepolia
   - Deploy with constructor: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
   - **Deployed at**: `0x7449478525Eb5106f487d44672B40592Af2a4E49`

### 2. Linera Bridge Tracker
```bash
# Update with deployed Sepolia bridge address
BRIDGE_TRACKER_ID=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/bridge_tracker_{contract,service}.wasm \
  --json-argument '{
    "ethereum_endpoint": "https://sepolia.infura.io/v3/YOUR_KEY",
    "bridge_contract": "0x7449478525Eb5106f487d44672B40592Af2a4E49",
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
    "sepolia": "0x7449478525Eb5106f487d44672B40592Af2a4E49"
  }
}
```

## Automated Deployment
```bash
# 1. Deploy EVM contracts via Remix first
# 2. Update bridge addresses in deploy script
# 3. Run automated Linera deployment
./deploy-bridge-dex.bash
```

## Dependencies
- EVM contracts → Bridge Tracker (needs contract addresses)
- Bridge Tracker → DEX (needs bridge tracker app ID)
- Frontend → All (needs all app IDs and contract addresses)
