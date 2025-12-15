import { useState, useEffect } from 'react';
import { LineraAdapter } from '../linera-adapter';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

interface Balance {
  token: string;
  amount: number;
}

interface PersistentBalances {
  balances: Balance[];
  loading: boolean;
  refreshBalances: () => Promise<void>;
  addBalance: (token: string, amount: number) => void;
}

export const usePersistentBalances = (): PersistentBalances => {
  const { primaryWallet } = useDynamicContext();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const STORAGE_KEY = `balances_${primaryWallet?.address || 'guest'}`;

  // Load balances from localStorage on mount
  useEffect(() => {
    const loadBalances = () => {
      if (primaryWallet?.address) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            setBalances(JSON.parse(saved));
          } else {
            // Initialize with empty balances when user connects
            setBalances([]);
          }
        } catch (err) {
          console.error('Failed to load balances:', err);
          setBalances([]);
        }
      }
      setLoading(false);
    };

    loadBalances();
  }, [primaryWallet?.address, STORAGE_KEY]);

  // Save balances to localStorage when they change
  useEffect(() => {
    if (!loading && primaryWallet?.address) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
      } catch (err) {
        console.error('Failed to save balances:', err);
      }
    }
  }, [balances, loading, primaryWallet?.address, STORAGE_KEY]);

  // Refresh balances from blockchain
  const refreshBalances = async () => {
    if (!primaryWallet?.address) return;
    
    setLoading(true);
    try {
      const adapter = LineraAdapter.getInstance();
      
      // For now, let's just return the stored balances
      // In a real implementation, this would fetch from the blockchain
      const blockchainBalances = await adapter.getUserBalances(primaryWallet.address);
      
      if (blockchainBalances?.userBalances) {
        const updatedBalances = blockchainBalances.userBalances.map((balance: any) => ({
          token: balance.token.symbol,
          amount: parseFloat(balance.amount) || 0
        }));
        
        setBalances(updatedBalances);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      // If blockchain fetch fails, we'll continue with cached balances
    } finally {
      setLoading(false);
    }
  };

  // Add or update a balance
  const addBalance = (token: string, amount: number) => {
    setBalances(prev => {
      const existingIndex = prev.findIndex(b => b.token === token);
      if (existingIndex >= 0) {
        const newBalances = [...prev];
        newBalances[existingIndex] = {
          ...newBalances[existingIndex],
          amount: newBalances[existingIndex].amount + amount
        };
        return newBalances;
      } else {
        return [...prev, { token, amount }];
      }
    });
  };

  return {
    balances,
    loading,
    refreshBalances,
    addBalance
  };
};