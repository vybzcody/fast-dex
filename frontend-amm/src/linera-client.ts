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
  dexAppId: string;
  bridgeTrackerAppId: string;
  rpcUrl: string;
  faucetUrl: string;
}

export interface BridgeToken {
  symbol: string;
  network: string;
}

export interface BridgeTokenInput {
  symbol: string;
  network: string;
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
  symbol: string;
  network: string;
  name?: string;
  decimals?: number;
}

export interface UserBalance {
  token_id: string;
  amount: string;
  symbol: string;
  appId: string;
}

// Supported tokens list
const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: "NAT",
    network: "linera",
    name: "Linera Native Token",
    decimals: 18,
  },
  {
    symbol: "USDC",
    network: "sepolia",
    name: "USD Coin",
    decimals: 6,
  },
  {
    symbol: "WETH",
    network: "sepolia",
    name: "Wrapped Ethereum",
    decimals: 18,
  },
];

// getTokenKey removed as it was unused

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
        if (this.config?.dexAppId) {
          this.appId = this.config.dexAppId;
        }
      } else {
        console.warn('Config not found, relying on manual appId');
      }
    } catch (error) {
      console.warn('Failed to load config, relying on manual appId');
    }
  }

  async initialize(dynamicWallet: DynamicWallet): Promise<LineraProvider> {
    if (this.provider) return this.provider;

    if (!dynamicWallet) {
      throw new Error("Dynamic wallet is required for Linera connection");
    }

    try {
      if (!this.config) {
        await this.loadConfig();
      }
      
      if (!this.config?.dexAppId) {
        throw new Error("No dexAppId found in config.json");
      }
      this.appId = this.config.dexAppId;
    } catch (error) {
      console.error("Initialization error:", error);
      throw error;
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
          tokenA {
            symbol
            network
          }
          tokenB {
            symbol
            network
          }
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
        const tokenA: Token = {
          symbol: p.tokenA.symbol,
          network: p.tokenA.network,
          ...SUPPORTED_TOKENS.find(t => t.symbol === p.tokenA.symbol)
        };
        const tokenB: Token = {
          symbol: p.tokenB.symbol,
          network: p.tokenB.network,
          ...SUPPORTED_TOKENS.find(t => t.symbol === p.tokenB.symbol)
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
    
    const q = `
      query($user: String!) {
        userBalances(user: $user) {
          token {
            symbol
            network
          }
          amount
        }
      }
    `;
    try {
      const data = await this.query(q, { user: this.provider.address });
      return (data?.userBalances || []).map((b: any) => ({
        token_id: b.token.symbol,
        amount: b.amount,
        symbol: b.token.symbol,
        appId: "" 
      }));
    } catch (e) {
      console.error("Error fetching balances:", e);
      return [];
    }
  }

  // Legacy faucet method - now returns supported tokens
  async getFaucetTokens(): Promise<Token[]> {
    return SUPPORTED_TOKENS;
  }

  // Legacy faucet claim - no longer supported
  async claimFaucetTokens(_token: any, _amount: string) {
    throw new Error("Faucet functionality removed. Use native token balances.");
  }

  // DEX Mutations
  async swapTokens(fromToken: string, toToken: string, amount: string) {
    const from = SUPPORTED_TOKENS.find(t => t.symbol === fromToken);
    const to = SUPPORTED_TOKENS.find(t => t.symbol === toToken);
    
    if (!from || !to) throw new Error("Invalid tokens");

    const mutation = `
      mutation($fromToken: BridgeTokenInput!, $toToken: BridgeTokenInput!, $amount: Amount!) {
        swapTokens(
          fromToken: $fromToken,
          toToken: $toToken,
          amount: $amount
        )
      }
    `;
    return await this.query(mutation, {
      fromToken: { symbol: from.symbol, network: from.network },
      toToken: { symbol: to.symbol, network: to.network },
      amount
    });
  }

  async createPool(
    tokenASymbol: string,
    tokenBSymbol: string,
    amountA: string,
    amountB: string,
    feeRate: number
  ) {
    const tokenA = SUPPORTED_TOKENS.find(t => t.symbol === tokenASymbol);
    const tokenB = SUPPORTED_TOKENS.find(t => t.symbol === tokenBSymbol);
    
    if (!tokenA || !tokenB) throw new Error("Invalid tokens");

    const mutation = `
      mutation($tokenA: BridgeTokenInput!, $tokenB: BridgeTokenInput!, $amountA: Amount!, $amountB: Amount!, $feeRate: Int!) {
        createPool(
          tokenA: $tokenA,
          tokenB: $tokenB,
          amountA: $amountA,
          amountB: $amountB,
          feeRate: $feeRate
        )
      }
    `;
    return await this.query(mutation, {
      tokenA: { symbol: tokenA.symbol, network: tokenA.network },
      tokenB: { symbol: tokenB.symbol, network: tokenB.network },
      amountA,
      amountB,
      feeRate
    });
  }

  async addLiquidity(
    tokenASymbol: string,
    tokenBSymbol: string,
    amountA: string,
    amountB: string
  ) {
    const tokenA = SUPPORTED_TOKENS.find(t => t.symbol === tokenASymbol);
    const tokenB = SUPPORTED_TOKENS.find(t => t.symbol === tokenBSymbol);
    
    if (!tokenA || !tokenB) throw new Error("Invalid tokens");

    const mutation = `
      mutation($tokenA: BridgeTokenInput!, $tokenB: BridgeTokenInput!, $amountA: Amount!, $amountB: Amount!) {
        addLiquidity(
          tokenA: $tokenA,
          tokenB: $tokenB,
          amountA: $amountA,
          amountB: $amountB
        )
      }
    `;
    return await this.query(mutation, {
      tokenA: { symbol: tokenA.symbol, network: tokenA.network },
      tokenB: { symbol: tokenB.symbol, network: tokenB.network },
      amountA,
      amountB
    });
  }

  async estimateSwap(
    fromTokenSymbol: string,
    toTokenSymbol: string,
    amount: string
  ): Promise<string> {
    const from = SUPPORTED_TOKENS.find(t => t.symbol === fromTokenSymbol);
    const to = SUPPORTED_TOKENS.find(t => t.symbol === toTokenSymbol);
    
    if (!from || !to) return "0";

    const q = `
      query($fromToken: BridgeTokenInput!, $toToken: BridgeTokenInput!, $amount: Amount!) {
        estimateSwap(
          fromToken: $fromToken,
          toToken: $toToken,
          amount: $amount
        )
      }
    `;
    try {
      const data = await this.query(q, {
        fromToken: { symbol: from.symbol, network: from.network },
        toToken: { symbol: to.symbol, network: to.network },
        amount
      });
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
