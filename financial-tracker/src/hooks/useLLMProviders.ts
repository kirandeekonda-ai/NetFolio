import { useState, useEffect } from 'react';
import { LLMProvider, LLMProviderCreate, LLMProviderUpdate, LLMTestResponse } from '@/types/llm';

interface UseLLMProvidersReturn {
  providers: LLMProvider[];
  loading: boolean;
  error: string | null;
  createProvider: (provider: LLMProviderCreate) => Promise<LLMProvider | null>;
  updateProvider: (id: string, updates: LLMProviderUpdate) => Promise<LLMProvider | null>;
  deleteProvider: (id: string) => Promise<boolean>;
  testProvider: (providerId: string, message: string) => Promise<LLMTestResponse>;
  testConfiguration: (config: any, message: string) => Promise<LLMTestResponse>;
  refreshProviders: () => Promise<void>;
}

export function useLLMProviders(): UseLLMProvidersReturn {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/llm-providers');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch providers');
      }
      
      setProviders(data.providers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const createProvider = async (provider: LLMProviderCreate): Promise<LLMProvider | null> => {
    try {
      const response = await fetch('/api/llm-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create provider');
      }
      
      await fetchProviders(); // Refresh the list
      return data.provider;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create provider');
      return null;
    }
  };

  const updateProvider = async (id: string, updates: LLMProviderUpdate): Promise<LLMProvider | null> => {
    try {
      const response = await fetch(`/api/llm-providers?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update provider');
      }
      
      await fetchProviders(); // Refresh the list
      return data.provider;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update provider');
      return null;
    }
  };

  const deleteProvider = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/llm-providers?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete provider');
      }
      
      await fetchProviders(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
      return false;
    }
  };

  const testProvider = async (providerId: string, message: string): Promise<LLMTestResponse> => {
    try {
      const response = await fetch('/api/llm-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, message }),
      });
      
      const data = await response.json();
      
      if (!response.ok && data.success === false) {
        // Test endpoint returns error details in the response even with 200 status
        return data;
      }
      
      await fetchProviders(); // Refresh to update test status
      return data;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
        latency_ms: 0
      };
    }
  };

  const testConfiguration = async (config: any, message: string): Promise<LLMTestResponse> => {
    try {
      const response = await fetch('/api/llm-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerConfig: config, message }),
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
        latency_ms: 0
      };
    }
  };

  const refreshProviders = async () => {
    await fetchProviders();
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return {
    providers,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    testConfiguration,
    refreshProviders,
  };
}
