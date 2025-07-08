// LLM Provider types
export type LLMProviderType = 'gemini' | 'azure_openai' | 'openai' | 'custom';

export type TestStatus = 'success' | 'failed' | 'pending' | null;

export interface LLMProvider {
  id: string;
  user_id: string;
  name: string;
  provider_type: LLMProviderType;
  
  // Configuration
  api_endpoint?: string;
  api_key?: string;
  model_name?: string;
  
  // Azure-specific
  azure_resource_name?: string;
  azure_deployment_name?: string;
  azure_api_version?: string;
  
  // Additional config
  additional_config?: Record<string, any>;
  
  // Status
  is_active: boolean;
  is_default: boolean;
  last_tested_at?: string;
  test_status?: TestStatus;
  test_error?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
}

export interface LLMProviderCreate {
  name: string;
  provider_type: LLMProviderType;
  api_endpoint?: string;
  api_key?: string;
  model_name?: string;
  azure_resource_name?: string;
  azure_deployment_name?: string;
  azure_api_version?: string;
  additional_config?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface LLMProviderUpdate {
  name?: string;
  api_endpoint?: string;
  api_key?: string;
  model_name?: string;
  azure_resource_name?: string;
  azure_deployment_name?: string;
  azure_api_version?: string;
  additional_config?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface LLMTestRequest {
  message: string;
}

export interface LLMTestResponse {
  success: boolean;
  response?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
}

// Predefined provider templates
export interface LLMProviderTemplate {
  name: string;
  provider_type: LLMProviderType;
  description: string;
  default_config: Partial<LLMProviderCreate>;
  required_fields: string[];
  optional_fields: string[];
}

export const LLM_PROVIDER_TEMPLATES: LLMProviderTemplate[] = [
  {
    name: 'Google Gemini API',
    provider_type: 'gemini',
    description: 'Google\'s Gemini AI models including 2.0 Flash',
    default_config: {
      provider_type: 'gemini',
      model_name: 'gemini-2.0-flash',
      api_endpoint: 'https://generativelanguage.googleapis.com'
    },
    required_fields: ['api_key', 'model_name'],
    optional_fields: []
  },
  {
    name: 'Azure OpenAI',
    provider_type: 'azure_openai',
    description: 'Microsoft Azure OpenAI Service',
    default_config: {
      provider_type: 'azure_openai',
      model_name: 'gpt-4o-mini',
      azure_api_version: '2024-08-01-preview'
    },
    required_fields: ['api_key', 'azure_resource_name', 'azure_deployment_name', 'azure_api_version'],
    optional_fields: ['model_name']
  },
  {
    name: 'OpenAI API',
    provider_type: 'openai',
    description: 'OpenAI\'s GPT models',
    default_config: {
      provider_type: 'openai',
      model_name: 'gpt-4o-mini',
      api_endpoint: 'https://api.openai.com/v1'
    },
    required_fields: ['api_key', 'model_name'],
    optional_fields: []
  },
  {
    name: 'Custom Endpoint',
    provider_type: 'custom',
    description: 'Self-hosted or custom AI service',
    default_config: {
      provider_type: 'custom'
    },
    required_fields: ['api_endpoint', 'model_name'],
    optional_fields: ['api_key']
  }
];
