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

  public get isInitialized(): boolean {
    return !!this.app;
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
      // @ts-ignore - Check if constructor returns promise at runtime
      const client = await new Client(wallet, signer);
      
      console.log("🔗 Connecting to chain:", chainId);
      const chain = await client.chain(chainId);
      this.app = await chain.application(this.appId as string);
      
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
    // The @linera/client app.query takes a JSON string
    // and returns a JSON string
    const resultJson = await this.app.query(JSON.stringify({ 
      query: queryString, 
      variables 
    }));

    const result = JSON.parse(resultJson);

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
          tokenA {
            chain
            address
            symbol
          }
          tokenB {
            chain
            address
            symbol
          }
          reserveA
          reserveB
          feeRate
        }
      }
    `;
    try {
      const data = await this.query(q);
      return (data?.pools || []).map((p: any, index: number) => ({
        id: index.toString(), // Pools are keyed by tokens in backend, assigning simpler index for frontend key
        tokenA: p.tokenA,
        tokenB: p.tokenB,
        reserveA: p.reserveA,
        reserveB: p.reserveB,
        totalShares: p.totalShares || "0", 
        feeRate: p.feeRate
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
          chain
          address
          symbol
        }
      }
    `;
    try {
       const data = await this.query(q);
       if (data?.faucetTokens) {
         return data.faucetTokens.map((t: any) => ({
           id: t.symbol, // Using symbol as ID for now since that's unique in the detailed list
           name: t.symbol.replace('MOCK_', ''),
           symbol: t.symbol,
           decimals: 18, // Backend doesn't store decimals yet, assuming 18
           chain: t.chain,
           address: t.address
         }));
       }
    } catch (e) {
       console.warn("Failed to fetch faucet tokens", e);
    }
    return [
      { id: "MOCK_USDC", name: "USD Coin", symbol: "USDC", decimals: 6, chain: "Ethereum", address: "0x..." }
    ];
  }

  async getUserBalances(address?: string): Promise<UserBalance[]> {
    const targetAddress = address || this.provider?.address;
    if (!targetAddress) return [];
    
    // Backend doesn't support filtering by owner in the query list yet, so we fetch all and filter
    const q = `
      query {
        userBalances {
          owner
          token {
            chain
            address
            symbol
          }
          amount
        }
      }
    `;
    try {
      const data = await this.query(q);
      const allBalances = data?.userBalances || [];
      return allBalances
        .filter((b: any) => b.owner === targetAddress)
        .map((b: any) => ({
          token_id: b.token.symbol,
          amount: b.amount,
          symbol: b.token.symbol
        }));
    } catch (e) {
      console.error("Error fetching balances:", e);
      return [];
    }
  }

  // Helper to format TokenId for GraphQL input
  private formatTokenInput(token: any): string {
    // Ensure we send the enum value for chain (e.g. "Ethereum") and strings for others
    // We assume token object has chain, address, symbol from our internal interfaces
    return `{ chain: ${token.chain}, address: "${token.address}", symbol: "${token.symbol}" }`;
  }

  async claimFaucetTokens(token: any, amount: string) {
    const mutation = `
        mutation {
            claimFaucetTokens(
                token: ${this.formatTokenInput(token)},
                amount: "${amount}"
            )
        }
    `;
    return await this.query(mutation);
  }

  async swapTokens(fromToken: any, toToken: any, amount: string) {
    const mutation = `
        mutation {
            swapTokens(
                fromToken: ${this.formatTokenInput(fromToken)},
                toToken: ${this.formatTokenInput(toToken)},
                amount: "${amount}"
            )
        }
    `;
    return await this.query(mutation);
  }

  async createPool(
    tokenA: any,
    tokenB: any,
    amountA: string,
    amountB: string,
    feeRate: number
  ) {
    const mutation = `
        mutation {
            createPool(
                tokenA: ${this.formatTokenInput(tokenA)},
                tokenB: ${this.formatTokenInput(tokenB)},
                amountA: "${amountA}",
                amountB: "${amountB}",
                feeRate: ${feeRate}
            )
        }
    `;
    return await this.query(mutation);
  }

  async addLiquidity(
    tokenA: any,
    tokenB: any,
    amountA: string,
    amountB: string
  ) {
    const mutation = `
        mutation {
            addLiquidity(
                tokenA: ${this.formatTokenInput(tokenA)},
                tokenB: ${this.formatTokenInput(tokenB)},
                amountA: "${amountA}",
                amountB: "${amountB}"
            )
        }
    `;
    return await this.query(mutation);
  }

  async estimateSwap(
    fromToken: any,
    toToken: any,
    amount: string
  ): Promise<string> {
    const q = `
        query {
            estimateSwap(
                tokenIn: ${this.formatTokenInput(fromToken)},
                tokenOut: ${this.formatTokenInput(toToken)},
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
