import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { LineraClientAdapter } from '../linera-client';

export const useBlockchainBalances = () => {
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { primaryWallet } = useDynamicContext();

  const refreshBalances = async () => {
    if (!primaryWallet?.address) return;

    try {
      setLoading(true);
      setError(null);
      
      const adapter = LineraClientAdapter.getInstance();
      const userBalances = await adapter.getUserBalances();
      
      // Convert to simple symbol -> amount mapping
      // Adapter now returns filtered list: { symbol, amount, token_id }
      const balanceMap: Record<string, string> = {};
      userBalances.forEach((balance: any) => {
        // We can trust the adapter already filtered by owner if needed,
        // or effectively just map the result.
        if (balance.symbol && balance.amount) {
            balanceMap[balance.symbol] = balance.amount;
        }
      });
      
      setBalances(balanceMap);
    } catch (err) {
      console.error('Failed to fetch balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (symbol: string): string => {
    return balances[symbol] || '0';
  };

  useEffect(() => {
    if (primaryWallet?.address) {
      refreshBalances();
    }
  }, [primaryWallet?.address]);

  return {
    balances,
    loading,
    error,
    refreshBalances,
    getBalance
  };
};
