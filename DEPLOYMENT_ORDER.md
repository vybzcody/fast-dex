# Deployment Order for FastDEX Production

Follow these steps in order to deploy FastDEX with real fungible tokens:

## Step 1: Build Project (DEX + Tokens)

Before deploying anything, ensure all modules verify and build successfully:
```bash
cd /home/groot/Code/akindo/linera/fast-dex
cargo build --release --target wasm32-unknown-unknown
```
**What this does:**
- ✅ Compiles DEX contract (`dex`)
- ✅ Compiles Token contracts (`fungible`, `native-fungible`)
- ✅ Verifies no dependency/type errors exist

---

## Step 2: Deploy DEX Contract
```bash
./deploy-to-conway.bash
```
**What this does:**
- ✅ Initializes local wallet (if missing)
- ✅ Deploys the DEX application
- ✅ Creates `frontend-amm/public/config.json`

---

## Step 3: Deploy Fungible Tokens (Sequential)

To avoid network timeouts, verify each step completes:

```bash
# 1. Publish Fungible Module
./deploy-step1-publish-fungible.sh

# 2. Publish Native Module
./deploy-step2-publish-native.sh

# 3. Create Tokens (NAT, USDC, WETH, DAI)
./deploy-step3-create-tokens.sh
```

**Expected output:**
```
🎉 Deployment Complete!
  • NAT Token: e476187f...
  • USDC Token: e476187f...
  • WETH Token: e476187f...
  • DAI Token: e476187f...
```

---

## Step 3: Verify Deployments

Test token balance query:

```bash
# Start Linera service
linera service --port 8080 &

# Get your chain ID
CHAIN_ID=$(linera wallet show | grep "Default Chain" -A 1 | tail -1 | awk '{print $1}')

# Open GraphiQL in browser
echo "http://localhost:8080/chains/$CHAIN_ID/applications/<TOKEN_APP_ID>"
```

Query:
```graphql
query {
  accounts {
    entries {
      key
      value
    }
  }
}
```

---

## Step 4: Update DEX Contract (Next Phase)

After tokens are deployed, you'll need to:
1. Update DEX contract to use `ApplicationId<FungibleTokenAbi>`
2. Rebuild and redeploy DEX
3. Update frontend to query fungible balances

---

## Important Notes

1. **Same Wallet**: Both scripts use the same local wallet files:
   - `wallet.json`
   - `keystore.json`
   - `client.db/`

2. **Order Matters**: Run `deploy-to-conway.bash` BEFORE `deploy-tokens.sh`

3. **Don't Delete Wallet Files**: Keep these files to maintain ownership of your applications

4. **App IDs**: Save all app IDs from both deployments - you'll need them for Phase 4

---

## Quick Reference

```bash
# 1. Deploy DEX
./deploy-to-conway.bash

# 2. Deploy Tokens
./deploy-tokens.sh

# 3. Check deployments
cat token-config.json
cat frontend-amm/public/config.json
```

Done! You now have:
- ✅ DEX application deployed
- ✅ 4 fungible tokens deployed (NAT, USDC, WETH, DAI)
- ✅ All app IDs saved
- ✅ Ready for Phase 4 (DEX contract migration)
