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
  tokenA: Token;
  tokenB: Token;
  reserveA: string;
  reserveB: string;
  totalShares: string;
  feeRate: number;
}

export interface Token {
  id: string; // ApplicationId
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
  appId: string;
}

// Known tokens map using environment variables
const KNOWN_TOKENS: Record<string, Token> = {
  [import.meta.env.REACT_APP_NAT_APP_ID]: {
    id: import.meta.env.REACT_APP_NAT_APP_ID,
    name: "Linera Native Token",
    symbol: "NAT",
    decimals: 18,
    chain: "Linera",
    address: import.meta.env.REACT_APP_NAT_APP_ID,
  },
  [import.meta.env.REACT_APP_USDC_APP_ID]: {
    id: import.meta.env.REACT_APP_USDC_APP_ID,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    chain: "Linera",
    address: import.meta.env.REACT_APP_USDC_APP_ID,
  },
  [import.meta.env.REACT_APP_WETH_APP_ID]: {
    id: import.meta.env.REACT_APP_WETH_APP_ID,
    name: "Wrapped Ethereum",
    symbol: "WETH",
    decimals: 18,
    chain: "Linera",
    address: import.meta.env.REACT_APP_WETH_APP_ID,
  },
  [import.meta.env.REACT_APP_DAI_APP_ID]: {
    id: import.meta.env.REACT_APP_DAI_APP_ID,
    name: "Dai Stablecoin",
    symbol: "DAI",
    decimals: 18,
    chain: "Linera",
    address: import.meta.env.REACT_APP_DAI_APP_ID,
  },
};

export class LineraClientAdapter {
  private static instance: LineraClientAdapter | null = null;
  private provider: LineraProvider | null = null;
  private config: LineraConfig | null = null;
  private wasmInitPromise: Promise<unknown> | null = null;
  private appId: string | undefined;
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

      // Create faucet, wallet, and claim chain
      const faucet = new Faucet(FAUCET_URL);
      const wallet = await faucet.createWallet();
      const chainId = await faucet.claimChain(wallet, address);

      // Create client with wallet and signer
      const signer = new DynamicSigner(dynamicWallet);
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

  private async query(queryString: string, variables: any = {}) {
    if (!this.app) {
      throw new Error("Linera client not initialized");
    }
    
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

  async getPools(): Promise<Pool[]> {
    const q = `
      query {
        pools {
          tokenA
          tokenB
          reserveA
          reserveB
          feeRate
          totalShares
        }
      }
    `;
    try {
      const data = await this.query(q);
      return (data?.pools || []).map((p: any, index: number) => {
        // Resolve ApplicationIds to token metadata
        const tokenA = KNOWN_TOKENS[p.tokenA] || { 
          id: p.tokenA, 
          symbol: 'UNK', 
          name: 'Unknown', 
          decimals: 0,
          chain: 'Linera',
          address: p.tokenA
        };
        const tokenB = KNOWN_TOKENS[p.tokenB] || { 
          id: p.tokenB, 
          symbol: 'UNK', 
          name: 'Unknown', 
          decimals: 0,
          chain: 'Linera',
          address: p.tokenB
        };

        return {
          id: index.toString(),
          tokenA,
          tokenB,
          reserveA: p.reserveA,
          reserveB: p.reserveB,
          totalShares: p.totalShares || "0", 
          feeRate: p.feeRate
        };
      });
    } catch (e) {
      console.error("Error fetching pools:", e);
      return [];
    }
  }

  async getUserBalances(): Promise<UserBalance[]> {
    if (!this.provider) return [];
    
    const balances: UserBalance[] = [];
    
    // Query each known token application for user balance
    for (const token of Object.values(KNOWN_TOKENS)) {
      try {
        const chain = await this.provider.client.chain(this.provider.chainId);
        const tokenApp = await chain.application(token.id);
        
        // Query the token application for account balances
        const q = `query { accounts { entries { key, value } } }`;
        const resultJson = await tokenApp.query(JSON.stringify({ query: q }));
        const result = JSON.parse(resultJson);
        
        if (result.data?.accounts?.entries) {
          // Find the entry for our owner
          // Note: This is simplified - in production you'd need proper owner matching
          for (const entry of result.data.accounts.entries) {
            if (entry.value && entry.value !== "0") {
              balances.push({
                token_id: token.symbol,
                amount: entry.value,
                symbol: token.symbol,
                appId: token.id
              });
              break; // Assume one balance per token for simplicity
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch balance for ${token.symbol}`, e);
        // Add zero balance for UI consistency
        balances.push({
          token_id: token.symbol,
          amount: "0",
          symbol: token.symbol,
          appId: token.id
        });
      }
    }
    
    return balances;
  }

  // Legacy faucet method - now returns known tokens
  async getFaucetTokens(): Promise<Token[]> {
    return Object.values(KNOWN_TOKENS);
  }

  // Legacy faucet claim - no longer supported
  async claimFaucetTokens(_token: any, _amount: string) {
    throw new Error("Faucet functionality removed. Use native token balances.");
  }

  // DEX Mutations
  async swapTokens(fromToken: string, toToken: string, amount: string) {
    const fromId = Object.values(KNOWN_TOKENS).find(t => t.symbol === fromToken)?.id;
    const toId = Object.values(KNOWN_TOKENS).find(t => t.symbol === toToken)?.id;
    
    if (!fromId || !toId) throw new Error("Invalid tokens");

    const mutation = `
      mutation {
        swapTokens(
          fromToken: "${fromId}",
          toToken: "${toId}",
          amount: "${amount}"
        )
      }
    `;
    return await this.query(mutation);
  }

  async createPool(
    tokenASymbol: string,
    tokenBSymbol: string,
    amountA: string,
    amountB: string,
    feeRate: number
  ) {
    const tokenA = Object.values(KNOWN_TOKENS).find(t => t.symbol === tokenASymbol)?.id;
    const tokenB = Object.values(KNOWN_TOKENS).find(t => t.symbol === tokenBSymbol)?.id;
    
    if (!tokenA || !tokenB) throw new Error("Invalid tokens");

    const mutation = `
      mutation {
        createPool(
          tokenA: "${tokenA}",
          tokenB: "${tokenB}",
          amountA: "${amountA}",
          amountB: "${amountB}",
          feeRate: ${feeRate}
        )
      }
    `;
    return await this.query(mutation);
  }

  async addLiquidity(
    tokenASymbol: string,
    tokenBSymbol: string,
    amountA: string,
    amountB: string
  ) {
    const tokenA = Object.values(KNOWN_TOKENS).find(t => t.symbol === tokenASymbol)?.id;
    const tokenB = Object.values(KNOWN_TOKENS).find(t => t.symbol === tokenBSymbol)?.id;
    
    if (!tokenA || !tokenB) throw new Error("Invalid tokens");

    const mutation = `
      mutation {
        addLiquidity(
          tokenA: "${tokenA}",
          tokenB: "${tokenB}",
          amountA: "${amountA}",
          amountB: "${amountB}"
        )
      }
    `;
    return await this.query(mutation);
  }

  async estimateSwap(
    fromTokenSymbol: string,
    toTokenSymbol: string,
    amount: string
  ): Promise<string> {
    const fromId = Object.values(KNOWN_TOKENS).find(t => t.symbol === fromTokenSymbol)?.id;
    const toId = Object.values(KNOWN_TOKENS).find(t => t.symbol === toTokenSymbol)?.id;
    
    if (!fromId || !toId) return "0";

    const q = `
      query {
        estimateSwap(
          fromToken: "${fromId}",
          toToken: "${toId}",
          amount: "${amount}"
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
    console.log("Subscribed to notifications (stub)", callback);
  }
}
