interface TokenId {
  chain: string;
  address: string;
  symbol: string;
}

interface LineraConfig {
  nodeUrl: string;
  chainId: string;
  appId: string;
}

export class LineraAdapter {
  private config: LineraConfig | null = null;
  private static instance: LineraAdapter | null = null;

  private constructor() {}

  static getInstance(): LineraAdapter {
    if (!LineraAdapter.instance) {
      LineraAdapter.instance = new LineraAdapter();
    }
    return LineraAdapter.instance;
  }

  async initialize() {
    try {
      const response = await fetch('/config.json');
      if (response.ok) {
        this.config = await response.json();
      } else {
        console.warn('Config file not found, DEX operations will be disabled until config is available');
      }
    } catch (error) {
      console.warn('Failed to load config, DEX operations will be disabled until config is available:', error);
    }
  }

  private async graphqlRequest(query: string, variables?: any) {
    if (!this.config) {
      console.warn('Adapter not initialized - config not loaded yet');
      // Return empty results or handle gracefully
      return { pools: [], userBalances: [] };
    }

    const response = await fetch(`${this.config.nodeUrl}/chains/${this.config.chainId}/applications/${this.config.appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
  }

  async getPools() {
    const query = `query { pools { tokenA { symbol } tokenB { symbol } reserveA reserveB } }`;
    return this.graphqlRequest(query);
  }

  async swapTokens(fromToken: string, toToken: string, amount: string) {
    const mutation = `
      mutation($fromToken: TokenIdInput!, $toToken: TokenIdInput!, $amount: String!) {
        swapTokens(fromToken: $fromToken, toToken: $toToken, amount: $amount)
      }`;
    return this.graphqlRequest(mutation, {
      fromToken: { chain: "Ethereum", address: "0x0", symbol: fromToken },
      toToken: { chain: "Ethereum", address: "0x0", symbol: toToken },
      amount
    });
  }

  async addLiquidity(tokenA: string, tokenB: string, amountA: string, amountB: string) {
    const mutation = `
      mutation($tokenA: TokenIdInput!, $tokenB: TokenIdInput!, $amountA: String!, $amountB: String!) {
        addLiquidity(tokenA: $tokenA, tokenB: $tokenB, amountA: $amountA, amountB: $amountB)
      }`;
    return this.graphqlRequest(mutation, {
      tokenA: { chain: "Ethereum", address: "0x0", symbol: tokenA },
      tokenB: { chain: "Ethereum", address: "0x0", symbol: tokenB },
      amountA,
      amountB
    });
  }

  async claimFaucetTokens(token: string, amount: string) {
    const mutation = `
      mutation($token: TokenIdInput!, $amount: String!) {
        claimFaucetTokens(token: $token, amount: $amount)
      }`;
    return this.graphqlRequest(mutation, {
      token: { chain: "Ethereum", address: token.toLowerCase(), symbol: token },
      amount
    });
  }

  async getUserBalances(owner: string) {
    const query = `query { userBalances { owner token { symbol } amount } }`;
    return this.graphqlRequest(query);
  }

  async getUserBalance(owner: string, token: string) {
    // This requires a more complex implementation that's service-dependent
    // For now, we'll return a method that gets all user balances and filters client-side
    const balances = await this.getUserBalances(owner);
    const tokenBalance = balances.userBalances?.find(
      (balance: any) => balance.token.symbol === token
    );
    return tokenBalance?.amount || "0";
  }
}
