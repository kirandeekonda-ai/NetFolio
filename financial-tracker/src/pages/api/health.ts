import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';
import { createLLMProvider } from '@/lib/llm/LLMProviderFactory';
import { routeLLMRequest } from '@/lib/llm/LLMRoutingService';

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
    // Use the new LLM routing service to test connectivity
    const routingResult = await routeLLMRequest(req, res);
    
    let geminiStatus: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key' = 'not_configured';
    let details = '';
    let providerInfo: { type: string; name: string; isCustomEndpoint: boolean } | undefined;
    
    if (routingResult.success && routingResult.provider) {
      console.log(`🔧 Testing LLM provider (${routingResult.source}):`, routingResult.provider.provider_type);
      
      try {
        // Test the provider connection
        const llmProvider = createLLMProvider(routingResult.provider);
        const testResult = await llmProvider.testConnection();
        
        providerInfo = {
          type: routingResult.provider.provider_type,
          name: routingResult.provider.name,
          isCustomEndpoint: routingResult.source === 'custom_endpoint'
        };
        
        if (testResult.success) {
          geminiStatus = 'available';
          details = `LLM provider connection successful (${routingResult.source}): ${routingResult.provider.name}`;
        } else {
          if (testResult.error?.includes('Invalid API key') || testResult.error?.includes('401')) {
            geminiStatus = 'invalid_key';
          } else {
            geminiStatus = 'connection_failed';
          }
          details = `LLM provider connection failed: ${testResult.error}`;
        }
      } catch (error) {
        geminiStatus = 'connection_failed';
        details = `LLM provider error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } else {
      // No LLM provider configured
      geminiStatus = 'not_configured';
      details = routingResult.error || 'No LLM configuration found';
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
