import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';
import { createLLMProvider } from '@/lib/llm/LLMProviderFactory';
import { createEnhancedLLMService } from '@/lib/llm/EnhancedLLMService';
import { isCustomEndpointAvailable } from '@/lib/llm/config';

interface HealthResponse {
  status: 'ok' | 'error';
  services: {
    gemini: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key';
    pdf_processing: 'available';
  };
  timestamp: string;
  details?: string;
  provider_info?: {
    type: string;
    name: string;
    isCustomEndpoint: boolean;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      services: {
        gemini: 'connection_failed',
        pdf_processing: 'available'
      },
      timestamp: new Date().toISOString(),
      details: 'Method not allowed'
    });
  }

  try {
    const supabase = createSupabaseServerClient(req, res);
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let geminiStatus: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key' = 'not_configured';
    let details = '';
    let providerInfo: { type: string; name: string; isCustomEndpoint: boolean } | undefined;

    // Check if custom endpoint is available
    if (isCustomEndpointAvailable()) {
      console.log('🔧 Custom endpoint is available, testing connection...');
      
      try {
        // Test custom endpoint
        const enhancedService = createEnhancedLLMService();
        const testResult = await enhancedService.testConnection();
        
        providerInfo = enhancedService.getProviderInfo();
        
        if (testResult.success) {
          geminiStatus = 'available';
          details = `Custom endpoint connection successful: ${providerInfo.name}`;
        } else {
          geminiStatus = 'connection_failed';
          details = `Custom endpoint connection failed: ${testResult.error}`;
        }
      } catch (error) {
        geminiStatus = 'connection_failed';
        details = `Custom endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else if (authError || !user) {
      // If no user and no custom endpoint, check environment variable as fallback
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        geminiStatus = 'not_configured';
        details = 'No custom endpoint configured and GEMINI_API_KEY environment variable is not set';
      } else {
        // Test the environment variable connection
        try {
          const { GeminiService } = await import('@/lib/llm/GeminiService');
          const geminiService = new GeminiService(geminiApiKey);
          const testResult = await geminiService.testConnection();
          
          if (testResult.success) {
            geminiStatus = 'available';
            details = 'Environment variable API connection successful';
          } else {
            if (testResult.error?.includes('Invalid API key')) {
              geminiStatus = 'invalid_key';
            } else {
              geminiStatus = 'connection_failed';
            }
            details = testResult.error || 'Connection test failed';
          }
        } catch (error) {
          geminiStatus = 'connection_failed';
          details = error instanceof Error ? error.message : 'Unknown connection error';
        }
      }
    } else {
      // User is authenticated, check their configured LLM providers
      try {
        const { data: provider, error: providerError } = await supabase
          .from('llm_providers')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('is_default', true)
          .single();

        if (providerError || !provider) {
          // Try to get any active provider
          const { data: anyProvider, error: anyError } = await supabase
            .from('llm_providers')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (anyError || !anyProvider) {
            geminiStatus = 'not_configured';
            details = 'No active LLM provider configured. Please configure an LLM provider in your profile settings.';
          } else {
            // Test the user's provider
            try {
              const llmService = createLLMProvider(anyProvider);
              const testResult = await llmService.testConnection();
              
              if (testResult.success) {
                geminiStatus = 'available';
                details = `${anyProvider.name} (${anyProvider.provider_type}) connection successful`;
              } else {
                if (testResult.error?.includes('Invalid API key') || testResult.error?.includes('401')) {
                  geminiStatus = 'invalid_key';
                } else {
                  geminiStatus = 'connection_failed';
                }
                details = testResult.error || 'Connection test failed';
              }
            } catch (error) {
              geminiStatus = 'connection_failed';
              details = error instanceof Error ? error.message : 'Unknown connection error';
            }
          }
        } else {
          // Test the default provider
          try {
            const llmService = createLLMProvider(provider);
            const testResult = await llmService.testConnection();
            
            if (testResult.success) {
              geminiStatus = 'available';
              details = `${provider.name} (${provider.provider_type}) connection successful`;
            } else {
              if (testResult.error?.includes('Invalid API key') || testResult.error?.includes('401')) {
                geminiStatus = 'invalid_key';
              } else {
                geminiStatus = 'connection_failed';
              }
              details = testResult.error || 'Connection test failed';
            }
          } catch (error) {
            geminiStatus = 'connection_failed';
            details = error instanceof Error ? error.message : 'Unknown connection error';
          }
        }
      } catch (error) {
        geminiStatus = 'connection_failed';
        details = error instanceof Error ? error.message : 'Error accessing provider configuration';
      }
    }
    
    const response: HealthResponse = {
      status: geminiStatus === 'available' ? 'ok' : 'error',
      services: {
        gemini: geminiStatus,
        pdf_processing: 'available'
      },
      timestamp: new Date().toISOString(),
      details,
      provider_info: providerInfo
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      services: {
        gemini: 'connection_failed',
        pdf_processing: 'available'
      },
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
