import {
  initialize,
  Client,
  Faucet,
  Wallet,
} from "@linera/client";
import type { Wallet as DynamicWallet } from "@dynamic-labs/sdk-react-core";
import { DynamicSigner } from "./lib/dynamic-signer";

const FAUCET_URL = "https://faucet.testnet-conway.linera.net";

export interface LineraProvider {
  client: Client;
  wallet: Wallet;
  faucet: Faucet;
  chainId: string;
  address: string;
  app: any; // Application backend
}

interface LineraConfig {
  appId: string;
}

export interface Pool {
  id: string;
  tokenA: any; // Using any to bypass strict check for now, or match TokenId shape
  tokenB: any;
  reserveA: string;
  reserveB: string;
  totalShares: string;
  feeRate: number;
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
  
  // Application backend instance from @linera/client
  private app: any;

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
        console.warn('Config not found, relying on manual appId');
      }
    } catch (error) {
      console.warn('Failed to load config, relying on manual appId');
    }
  }

  async initialize(dynamicWallet: DynamicWallet, appId?: string): Promise<LineraProvider> {
    if (this.provider) return this.provider;

    if (!dynamicWallet) {
      throw new Error("Dynamic wallet is required for Linera connection");
    }

    if (appId) {
      this.appId = appId;
    } else if (this.config?.appId) {
      this.appId = this.config.appId;
    } else {
      await this.loadConfig();
      if (!this.appId) {
         throw new Error("No app ID configured. Call initialize() first or provide appId.");
      }
    }

    try {
      const { address } = dynamicWallet;
      console.log("🔗 Initializing FastDEX with wallet:", address);

      // Initialize WASM
      try {
        if (!this.wasmInitPromise) this.wasmInitPromise = initialize();
        await this.wasmInitPromise;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("storage is already initialized")) {
          throw e;
        }
      }

      // Create Client
      const signer = new DynamicSigner(dynamicWallet);
      const faucet = new Faucet(FAUCET_URL);
      
      console.log("🔗 Creating Linera Client wallet...");
      const wallet = await faucet.createWallet(); 
      
      // Try to claim a chain for the user or reuse one
      let chainId: string;
      try {
          console.log("🔗 Requesting chain from faucet (with timeout)...");
          // Race faucet claim against a 15s timeout
          const claimPromise = faucet.claimChain(wallet, await signer.address());
          const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("Faucet claim timeout")), 15000)
          );
          
          chainId = await Promise.race([claimPromise, timeoutPromise]);
          console.log("✅ Chain claimed:", chainId);
      } catch (e) {
          console.warn("⚠️ Could not claim chain from faucet:", e);
          // Without a chain, we cannot interact with the application.
          throw new Error("Failed to obtain a Linera chain. The testnet faucet might be busy/down, or the request timed out. Please try again later.");
      }

      console.log("🔗 Instantiating Client...");
      const client = new Client(wallet, signer);
      
      // Get the application backend - check correct method on Client
      // In 0.15.x it might be different, let's look for `load` or similar or direct query
      // Recent SDK: client.load(appId) or similar. 
      // Based on docs search it was `client.javascript_client().application(..)`?
      // Or simply explicit query construction if Client doesn't expose it directly.
      // Let's assume standard way for now or check definitions.
      // Actually @linera/client usually has `frontend()` or similar?
      // User's previous code had manual fetch.
      // Let's try `await (client as any).application(this.appId)` to bypass TS if needed, or fix properly.
      // But standard is client.application
      this.app = await (client as any).application(this.appId as string);
      
      console.log("✅ FastDEX initialized. AppID:", this.appId, "ChainID:", chainId);

      this.provider = {
        client,
        wallet,
        faucet,
        chainId,
        address: dynamicWallet.address,
        app: this.app
      };

      return this.provider;
    } catch (error) {
      console.error("Failed to initialize FastDEX:", error);
      throw error;
    }
  }

  // Use the official client to query
  private async query(queryString: string, variables: any = {}) {
    if (!this.app) {
      throw new Error("Linera client not initialized");
    }
    
    // The @linera/client app.query takes a standardized GraphQL JSON object
    // or a string depending on version. Usually handles the transport.
    const result = await this.app.query({ 
      query: queryString, 
      variables 
    });

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    return result.data;
  }

  // Data fetching methods - unchanged logic, just using new query
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
        tokenA: { chain: "LINERA", address: p.token0, symbol: "TKA" }, // Mock metadata as contract only stores IDs
        tokenB: { chain: "LINERA", address: p.token1, symbol: "TKB" },
        reserveA: p.reserve0,
        reserveB: p.reserve1,
        totalShares: p.totalShares || "0", 
        feeRate: parseInt(p.fee) || 30
      }));
    } catch (e) {
      console.error("Error fetching pools:", e);
      return [];
    }
  }

  async getFaucetTokens(): Promise<FaucetToken[]> {
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
       console.warn("Failed to fetch faucet tokens", e);
    }
    return [
      { id: "MOCK_USDC", name: "USD Coin", symbol: "USDC", decimals: 6, chain: "LINERA", address: "0x..." },
      { id: "MOCK_ETH", name: "Ethereum", symbol: "ETH", decimals: 18, chain: "LINERA", address: "0x..." },
      { id: "MOCK_BTC", name: "Bitcoin", symbol: "BTC", decimals: 8, chain: "LINERA", address: "0x..." },
    ];
  }

  async getUserBalances(address?: string): Promise<UserBalance[]> {
    const targetAddress = address || this.provider?.address;
    if (!targetAddress) return [];
    
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
    // Basic stub - in real implementation this would subscribe to client events
    console.log("Subscribed to notifications (stub)", callback);
  }
}
