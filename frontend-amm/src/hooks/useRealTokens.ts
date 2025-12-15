import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isEthereumWallet } from '@dynamic-labs/ethereum';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { MAINNET_CHAINS, TESTNET_CHAINS } from '../config/tokens';

interface TokenBalance {
  symbol: string;
  balance: string;
  address: string;
  decimals: number;
}

interface GeneratedWallet {
  address: string;
  privateKey: string;
  chainId: number;
}

export const useRealTokens = () => {
  const { primaryWallet } = useDynamicContext();
  const [balances, setBalances] = useState<Record<number, TokenBalance[]>>({});
  const [generatedWallets, setGeneratedWallets] = useState<GeneratedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentChain, setCurrentChain] = useState<number | null>(null);
  const [isTestnet, setIsTestnet] = useState(false);

  const CHAIN_CONFIG = isTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;
  const supportedChains = Object.keys(CHAIN_CONFIG).map(Number);

  // Generate deterministic wallet for each chain
  const generateWalletForChain = async (chainId: number) => {
    if (!primaryWallet) return;
    
    // Create deterministic private key based on user wallet + network type (NOT chain specific)
    // This ensures same address across all EVM chains
    const seed = primaryWallet.address + (isTestnet ? 'testnet' : 'mainnet');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
    const privateKey = `0x${Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const wallet = {
      address: account.address,
      privateKey,
      chainId,
    };
    
    setGeneratedWallets(prev => [...prev.filter(w => w.chainId !== chainId), wallet]);
    return wallet;
  };

  // Fetch real token balances
  const fetchTokenBalances = async (chainId: number, walletAddress: string) => {
    const chainConfig = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
    if (!chainConfig) return [];

    setLoading(true);
    const tokenBalances: TokenBalance[] = [];

    try {
      const publicClient = createPublicClient({
        chain: {
          id: chainId,
          name: chainConfig.name,
          rpcUrls: {
            default: { http: [chainConfig.rpcUrl] },
            public: { http: [chainConfig.rpcUrl] }
          },
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
        },
        transport: http(chainConfig.rpcUrl),
      });

      // Fetch balances for each token
      for (const [symbol, tokenConfig] of Object.entries(chainConfig.tokens)) {
        try {
          const balance = await publicClient.readContract({
            address: tokenConfig.address as `0x${string}`,
            abi: [
              {
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'owner', type: 'address' }],
                outputs: [{ name: '', type: 'uint256' }]
              }
            ],
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          });

          const formattedBalance = formatUnits(balance, tokenConfig.decimals);
          
          tokenBalances.push({
            symbol,
            balance: formattedBalance,
            address: tokenConfig.address,
            decimals: tokenConfig.decimals,
          });
        } catch (error) {
          console.error(`Failed to fetch ${symbol} balance:`, error);
          tokenBalances.push({
            symbol,
            balance: '0',
            address: tokenConfig.address,
            decimals: tokenConfig.decimals,
          });
        }
      }

      setBalances(prev => ({ ...prev, [chainId]: tokenBalances }));
      return tokenBalances;
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Clear data when switching networks
  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
    setBalances({});
    setGeneratedWallets([]);
  };

  // Get current chain from connected wallet
  useEffect(() => {
    const getCurrentChain = async () => {
      if (primaryWallet && isEthereumWallet(primaryWallet)) {
        try {
          const walletClient = await primaryWallet.getWalletClient();
          const chainId = await walletClient.getChainId();
          setCurrentChain(chainId);
        } catch (error) {
          console.error('Failed to get chain ID:', error);
        }
      }
    };
    getCurrentChain();
  }, [primaryWallet]);

  // Real token swap using generated wallet
  const swapTokens = async (
    fromToken: string, 
    toToken: string, 
    amount: string, 
    chainId: number
  ) => {
    const wallet = generatedWallets.find(w => w.chainId === chainId);
    if (!wallet) throw new Error('No wallet generated for this chain');

    const chainConfig = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
    if (!chainConfig) throw new Error('Chain not supported');

    setLoading(true);
    try {
      // In real implementation, this would:
      // 1. Check allowances
      // 2. Execute swap via DEX router (Uniswap, etc.)
      // 3. Update balances
      
      // For now, simulate CFMM swap with 0.3% fee
      const fee = 0.003;
      const received = (parseFloat(amount) * (1 - fee)).toString();
      
      // Update local balances
      setBalances(prev => ({
        ...prev,
        [chainId]: prev[chainId]?.map(token => {
          if (token.symbol === fromToken) {
            return { ...token, balance: (parseFloat(token.balance) - parseFloat(amount)).toString() };
          }
          if (token.symbol === toToken) {
            return { ...token, balance: (parseFloat(token.balance) + parseFloat(received)).toString() };
          }
          return token;
        }) || []
      }));
      
      return received;
    } finally {
      setLoading(false);
    }
  };

  return {
    balances,
    generatedWallets,
    loading,
    currentChain,
    supportedChains,
    isTestnet,
    generateWalletForChain,
    fetchTokenBalances,
    swapTokens,
    toggleNetwork,
  };
};
