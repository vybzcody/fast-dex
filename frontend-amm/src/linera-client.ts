import {
  initialize,
  Client,
  Faucet,
  Wallet,
} from "@linera/client";
import type { Wallet as DynamicWallet } from "@dynamic-labs/sdk-react-core";
import { DynamicSigner } from "./lib/dynamic-signer";

const LINERA_RPC_URL = "https://testnet-archimedes.linera.io/";

export interface LineraProvider {
  client: Client;
  wallet: Wallet;
  faucet: Faucet;
  chainId: string;
  address: string;
}

interface LineraConfig {
  appId: string;
}

export interface Pool {
  id: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  fee: string;
}

export interface FaucetToken {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  chain: string;
  address: string;
}

export interface UserBalance {
  token_id: string;
  amount: string;
  symbol: string;
}

export class LineraClientAdapter {
  private static instance: LineraClientAdapter | null = null;
  private provider: LineraProvider | null = null;
  private config: LineraConfig | null = null;
  private wasmInitPromise: Promise<unknown> | null = null;
  private appId: string | undefined;
  private chainId: string | undefined;

  private constructor() {}

  public static getInstance(): LineraClientAdapter {
    if (!LineraClientAdapter.instance) {
      LineraClientAdapter.instance = new LineraClientAdapter();
    }
    return LineraClientAdapter.instance;
  }

  async loadConfig() {
    try {
      const response = await fetch('/config.json');
      if (response.ok) {
        this.config = await response.json();
        console.log('Config loaded:', this.config);
        if (this.config?.appId) {
          this.appId = this.config.appId;
        }
      } else {
        throw new Error('Config not found');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      // Fallback or rethrow depending on strictness. 
      // For now, allow continuing, initialize might fail if appId is missing.
    }
  }

  async initialize(dynamicWallet: DynamicWallet, appId?: string): Promise<LineraProvider> {
    // Return existing provider if already initialized
    if (this.provider) return this.provider;

    if (!dynamicWallet) {
      throw new Error("Dynamic wallet is required for Linera connection");
    }

    // Prefer passed appId, then config appId
    if (appId) {
      this.appId = appId;
    } else if (this.config?.appId) {
      this.appId = this.config.appId;
    } else {
      // Try to load config one last time if not loaded
      await this.loadConfig();
      if (!this.appId) {
         throw new Error("No app ID configured. Call initialize() first or provide appId.");
      }
    }

    try {
      const { address } = dynamicWallet;
      console.log("🔗 Initializing FastDEX with wallet:", address);

      // Step 1: Initialize WASM modules
      try {
        if (!this.wasmInitPromise) this.wasmInitPromise = initialize();
        await this.wasmInitPromise;
        console.log("✅ Linera WASM modules initialized");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("storage is already initialized")) {
          console.warn("⚠️ Linera storage already initialized; continuing");
        } else {
          throw e;
        }
      }

      // Step 2: Create Linera client with Dynamic signer
      const signer = new DynamicSigner(dynamicWallet);
      
      const faucet = new Faucet(LINERA_RPC_URL);
      const wallet = await faucet.createWallet();
      
      // Attempt to claim chain or get existing
      let chainId: string;
      try {
          chainId = await faucet.claimChain(wallet, address);
      } catch (e) {
          console.warn("Could not claim chain (maybe limit reached), using default/cached logic if available or proceeding with generic wallet info", e);
          // For now, assume claimChain works or throws. 
          // If we want a fallback chainID for testing functionality without claiming every time:
          // chainId = "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad05928c054619d7184";
          throw e;
      }
      this.chainId = chainId;
      
      const client = new Client(wallet, signer);
      console.log("✅ Linera client created");
      console.log("✅ FastDEX initialized. AppID:", this.appId, "ChainID:", this.chainId);

      this.provider = {
        client,
        wallet,
        faucet,
        chainId,
        address: dynamicWallet.address,
      };

      return this.provider;
    } catch (error) {
      console.error("Failed to initialize FastDEX:", error);
      throw new Error(
        `Failed to initialize FastDEX: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Generic query method
  private async query(queryString: string, variables: any = {}) {
    if (!this.chainId || !this.appId) {
      throw new Error("Linera client not initialized (missing chainId or appId)");
    }
    const graphqlEndpoint = `http://localhost:8081/chains/${this.chainId}/applications/${this.appId}`;
    
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryString, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    return result.data;
  }

  // Data fetching methods

  async getPools(): Promise<Pool[]> {
    const q = `
      query {
        pools {
          id
          token0
          token1
          reserve0
          reserve1
          fee
        }
      }
    `;
    try {
      const data = await this.query(q);
      return (data?.pools || []).map((p: any) => ({
        id: p.id,
        tokenA: p.token0,
        tokenB: p.token1,
        reserveA: p.reserve0,
        reserveB: p.reserve1,
        fee: p.fee
      }));
    } catch (e) {
      console.error("Error fetching pools:", e);
      return [];
    }
  }

  async getFaucetTokens(): Promise<FaucetToken[]> {
    // In a real app, this might query the contract. 
    // If the contract has a faucetTokens query:
    const q = `
      query {
        faucetTokens {
          id
          name
          symbol
          decimals
        }
      }
    `;
    try {
       const data = await this.query(q);
       if (data?.faucetTokens) return data.faucetTokens;
    } catch (e) {
       console.warn("Failed to fetch faucet tokens from chain, using fallback", e);
    }

    // Fallback static data if query fails or doesn't exist yet
    // Include dummy chain/address to satisfy legacy UI types
    return [
      { id: "MOCK_USDC", name: "USD Coin", symbol: "USDC", decimals: 6, chain: "LINERA", address: "0x..." },
      { id: "MOCK_ETH", name: "Ethereum", symbol: "ETH", decimals: 18, chain: "LINERA", address: "0x..." },
      { id: "MOCK_BTC", name: "Bitcoin", symbol: "BTC", decimals: 8, chain: "LINERA", address: "0x..." },
    ];
  }

  async getUserBalances(address?: string): Promise<UserBalance[]> {
    const targetAddress = address || this.provider?.address;
    if (!targetAddress) {
        console.warn("No address provided for balances");
        return [];
    }
    
    const q = `
      query {
        balances(owner: "${targetAddress}") {
          tokenId
          amount
          symbol
        }
      }
    `;
    try {
      const data = await this.query(q);
      return data?.balances || [];
    } catch (e) {
      console.error("Error fetching balances:", e);
      return [];
    }
  }

  async claimFaucetTokens(token: any, amount: string) {
    const mutation = `
        mutation {
            claim(tokenId: "${token.id}", amount: "${amount}")
        }
    `;
    return await this.query(mutation);
  }

  async swapTokens(fromToken: string, toToken: string, amount: string) {
    const mutation = `
        mutation {
            swap(
                input: {
                    token0: "${fromToken}",
                    token1: "${toToken}",
                    amountIn: "${amount}",
                    amountOutMin: "0" 
                }
            )
        }
    `;
    return await this.query(mutation);
  }

  async createPool(
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    feeRate: number
  ) {
    const mutation = `
        mutation {
            createPool(
                token0: "${tokenA}",
                token1: "${tokenB}",
                amount0: "${amountA}",
                amount1: "${amountB}",
                fee: "${feeRate}"
            )
        }
    `;
    return await this.query(mutation);
  }

  async addLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string
  ) {
    const mutation = `
        mutation {
            addLiquidity(
                token0: "${tokenA}",
                token1: "${tokenB}",
                amount0Desired: "${amountA}",
                amount1Desired: "${amountB}",
                amount0Min: "0",
                amount1Min: "0"
            )
        }
    `;
    return await this.query(mutation);
  }

  async estimateSwap(
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<string> {
    // This typically isn't a mutation, but a query.
    // However, if implemented as a dry-run mutation or specific query:
    const q = `
        query {
            estimateSwap(
                tokenIn: "${fromToken}",
                tokenOut: "${toToken}",
                amountIn: "${amount}"
            )
        }
    `;
    try {
        const data = await this.query(q);
        return data?.estimateSwap || "0";
    } catch (e) {
        console.error("Error estimating swap:", e);
        return "0";
    }
  }

  onNotification(callback: (notification: unknown) => void) {
    // Stub implementation until websocket/subscription support is fully verified
    console.log("Subscribed to notifications (stub)", callback);
  }
}
