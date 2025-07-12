/**
 * LLM Routing Service
 * Implements prioritized routing mechanism:
 * 1. Custom endpoint (if configured)
 * 2. User's configured LLM provider (fallback)
 * 3. Clear error message (if neither configured)
 */

import { LLMProvider } from '@/types/llm';
import { createSupabaseServerClient } from '@/utils/supabase';
import { getActiveLLMProvider } from './config';
import { NextApiRequest, NextApiResponse } from 'next';

export interface LLMRoutingResult {
  success: boolean;
  provider?: LLMProvider;
  error?: string;
  source: 'custom_endpoint' | 'user_provider' | 'none';
}

/**
 * Get user's configured LLM provider from database
 */
async function getUserLLMProvider(req: NextApiRequest, res: NextApiResponse): Promise<LLMProvider | null> {
  try {
    const supabase = createSupabaseServerClient(req, res);
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ No authenticated user for LLM provider fetch');
      return null;
    }

    // Get the user's default active LLM provider
    const { data: provider, error } = await supabase
      .from('llm_providers')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (error) {
      // If no default provider, try to get any active provider
      const { data: anyProvider, error: anyError } = await supabase
        .from('llm_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (anyError || !anyProvider) {
        console.log('❌ No active LLM provider found for user');
        return null;
      }

      console.log('✅ Using first available active LLM provider:', anyProvider.name);
      return anyProvider;
    }

    console.log('✅ Using default LLM provider:', provider.name);
    return provider;
  } catch (error) {
    console.error('❌ Error fetching user LLM provider:', error);
    return null;
  }
}

/**
 * Route LLM request with prioritized fallback logic
 * This is the main function that implements the business requirements
 */
export async function routeLLMRequest(req: NextApiRequest, res: NextApiResponse): Promise<LLMRoutingResult> {
  console.log('🔀 Starting LLM routing process...');

  try {
    // Step 1: Try custom endpoint (highest priority)
    try {
      const customProvider = getActiveLLMProvider();
      if (customProvider.provider_type === 'custom') {
        console.log('✅ Using custom endpoint (priority 1):', customProvider.api_endpoint);
        return {
          success: true,
          provider: customProvider,
          source: 'custom_endpoint'
        };
      }
    } catch (error) {
      console.log('ℹ️ Custom endpoint not configured, trying user provider...');
    }

    // Step 2: Try user's configured LLM provider (fallback)
    const userProvider = await getUserLLMProvider(req, res);
    if (userProvider) {
      const providerConfig = getActiveLLMProvider(userProvider);
      console.log('✅ Using user LLM provider (priority 2):', userProvider.provider_type);
      return {
        success: true,
        provider: providerConfig,
        source: 'user_provider'
      };
    }

    // Step 3: Neither custom endpoint nor user provider configured
    console.log('❌ No LLM configuration found');
    return {
      success: false,
      error: 'No LLM configuration found. Please configure a provider or a custom endpoint to proceed.',
      source: 'none'
    };

  } catch (error) {
    console.error('❌ LLM routing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM routing failed',
      source: 'none'
    };
  }
}

/**
 * Client-side helper for hooks to get LLM provider
 */
export async function getClientLLMProvider(): Promise<LLMProvider | null> {
  try {
    // First check if custom endpoint is configured
    const customEndpointEnabled = process.env.NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT === 'true';
    const customEndpoint = process.env.NEXT_PUBLIC_CUSTOM_LLM_ENDPOINT;
    
    if (customEndpointEnabled && customEndpoint) {
      console.log('✅ Client: Using custom endpoint');
      // Return custom endpoint provider config
      return {
        id: 'custom-client-endpoint',
        user_id: 'client',
        name: 'Custom Development Endpoint',
        provider_type: 'custom',
        api_endpoint: customEndpoint,
        api_key: process.env.NEXT_PUBLIC_CUSTOM_LLM_API_KEY,
        model_name: 'custom-model',
        is_active: true,
        is_default: false,
        test_status: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Fetch user's default provider from API
    const response = await fetch('/api/llm-providers/default');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Client: Using user LLM provider:', data.provider?.provider_type);
      return data.provider;
    } else {
      console.log('❌ Client: No user LLM provider found');
      return null;
    }
  } catch (error) {
    console.error('❌ Client: Error getting LLM provider:', error);
    return null;
  }
}

/**
 * Hook helper to get LLM provider with proper error handling
 */
export function createLLMProviderHook() {
  return {
    async getLLMProvider(): Promise<{ provider: LLMProvider | null; error: string | null }> {
      try {
        const provider = await getClientLLMProvider();
        
        if (!provider) {
          return {
            provider: null,
            error: 'No LLM configuration found. Please configure a provider or a custom endpoint to proceed.'
          };
        }

        return {
          provider,
          error: null
        };
      } catch (error) {
        return {
          provider: null,
          error: error instanceof Error ? error.message : 'Failed to get LLM provider'
        };
      }
    }
  };
}
