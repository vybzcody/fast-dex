// Verified token contracts from official sources (CoinGecko, Uniswap token lists)
export const MAINNET_CHAINS = {
  // Polygon (137)
  137: {
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    tokens: {
      USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
      USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      DAI: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 },
      WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
      WMATIC: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18 },
    }
  },
  // Arbitrum One (42161) - Updated with current USDC address
  42161: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    tokens: {
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }, // Native USDC
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
      DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
      WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
      ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
    }
  },
  // Base (8453)
  8453: {
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    tokens: {
      USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      DAI: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
      CBETH: { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
    }
  },
  // Optimism (10)
  10: {
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    tokens: {
      USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 }, // Native USDC
      USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
      DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
      OP: { address: '0x4200000000000000000000000000000000000042', decimals: 18 },
    }
  },
};

export const TESTNET_CHAINS = {
  // Polygon Mumbai (80001) - Verified testnet addresses
  80001: {
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorer: 'https://mumbai.polygonscan.com',
    tokens: {
      USDC: { address: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747', decimals: 6 }, // Mumbai USDC
      USDT: { address: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832', decimals: 6 },
      WMATIC: { address: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', decimals: 18 },
    }
  },
  // Base Sepolia (84532)
  84532: {
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    tokens: {
      USDC: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6 },
      WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    }
  },
  // Arbitrum Sepolia (421614)
  421614: {
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    tokens: {
      USDC: { address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', decimals: 6 },
      WETH: { address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', decimals: 18 },
    }
  },
};

export const CHAIN_CONFIG = MAINNET_CHAINS;
