/**
 * LLM Configuration Utility
 * Handles switching between production LLM providers and development custom endpoint
 */

import { LLMProvider } from '@/types/llm';

interface CustomEndpointConfig {
  endpoint: string;
  api_key?: string;
  name?: string;
}

interface LLMConfig {
  useCustomEndpoint: boolean;
  customEndpoint?: CustomEndpointConfig;
  fallbackProvider?: LLMProvider;
}

/**
 * Get LLM configuration based on environment and user preferences
 */
export function getLLMConfig(): LLMConfig {
  // Check if custom endpoint is enabled via environment variable
  const useCustomEndpoint = process.env.NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT === 'true';
  
  // Default custom endpoint configuration
  const customEndpoint: CustomEndpointConfig = {
    endpoint: process.env.NEXT_PUBLIC_CUSTOM_LLM_ENDPOINT || 'https://ai-wrapper.onrender.com/generate',
    api_key: process.env.NEXT_PUBLIC_CUSTOM_LLM_API_KEY,
    name: process.env.NEXT_PUBLIC_CUSTOM_LLM_NAME || 'Custom Development Endpoint'
  };

  return {
    useCustomEndpoint,
    customEndpoint,
    fallbackProvider: undefined // Will be set dynamically from user's selected provider
  };
}

/**
 * Create a virtual LLM provider configuration for the custom endpoint
 */
export function createCustomEndpointProvider(config: CustomEndpointConfig): LLMProvider {
  return {
    id: 'custom-dev-endpoint',
    user_id: 'development',
    name: config.name || 'Custom Development Endpoint',
    provider_type: 'custom',
    api_endpoint: config.endpoint,
    api_key: config.api_key,
    model_name: 'custom-model',
    is_active: true,
    is_default: false,
    test_status: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Get the active LLM provider configuration
 * Returns custom endpoint config if enabled, otherwise returns the provided fallback
 */
export function getActiveLLMProvider(fallbackProvider?: LLMProvider): LLMProvider {
  const config = getLLMConfig();
  
  if (config.useCustomEndpoint && config.customEndpoint) {
    console.log('🔧 Using custom endpoint for LLM requests:', config.customEndpoint.endpoint);
    return createCustomEndpointProvider(config.customEndpoint);
  }
  
  if (fallbackProvider) {
    console.log('🚀 Using production LLM provider:', fallbackProvider.provider_type);
    return fallbackProvider;
  }
  
  throw new Error('No LLM provider configured. Please set up a provider in your profile or enable custom endpoint.');
}

/**
 * Check if custom endpoint is available and configured
 */
export function isCustomEndpointAvailable(): boolean {
  const config = getLLMConfig();
  
  console.log('🔍 Custom endpoint availability check:', {
    useCustomEndpoint: config.useCustomEndpoint,
    hasEndpoint: !!config.customEndpoint?.endpoint,
    endpoint: config.customEndpoint?.endpoint,
    envVar: process.env.NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT
  });
  
  return config.useCustomEndpoint && !!config.customEndpoint?.endpoint;
}

/**
 * Get environment-specific logging configuration
 */
export function getLLMLoggingConfig() {
  return {
    enableDebugLogs: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LLM_DEBUG === 'true',
    enablePromptLogging: process.env.NEXT_PUBLIC_LLM_LOG_PROMPTS === 'true',
    enableResponseLogging: process.env.NEXT_PUBLIC_LLM_LOG_RESPONSES === 'true'
  };
}
