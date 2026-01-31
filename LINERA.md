# Linera Frontend Integration Guide

## Key Points from linera.dev

### 1. Use @linera/client Library
- Don't make direct GraphQL calls
- Use the official Linera Web client library
- Requires specific headers for SharedArrayBuffer support

### 2. Required Headers
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### 3. Client Library Usage
```javascript
import * as linera from '@linera/client';

// Initialize
await linera.default();

// Get wallet and client
const faucet = await new linera.Faucet('https://faucet.testnet-conway.linera.net');
const wallet = await faucet.createWallet();
const client = await new linera.Client(wallet);

// Get application backend
const backend = await client.frontend().application(APP_ID);

// Query application
const response = await backend.query('{ "query": "query { value }" }');
```

### 4. Notifications for Reactivity
```javascript
client.onNotification(notification => {
  if (notification.reason.NewBlock) updateData();
});
```

## Current Issues
1. Using direct fetch() instead of @linera/client
2. Missing required CORS headers
3. No proper Linera client initialization

## Solution
Replace custom GraphQL adapter with official Linera client library.
