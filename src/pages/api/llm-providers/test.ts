import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServerClient } from '@/utils/supabase';
import { LLMTestRequest, LLMTestResponse, LLMProviderType } from '@/types/llm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LLMTestResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      latency_ms: 0
    });
  }

  const supabase = createSupabaseServerClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized',
      latency_ms: 0
    });
  }

  try {
    const { providerId, providerConfig, message } = req.body as {
      providerId?: string;
      providerConfig?: any;
      message: string;
    };

    const startTime = Date.now();

    // If providerId is provided, get config from database
    let config = providerConfig;
    if (providerId) {
      const { data: provider, error } = await supabase
        .from('llm_providers')
        .select('*')
        .eq('id', providerId)
        .eq('user_id', user.id)
        .single();

      if (error || !provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
          latency_ms: Date.now() - startTime
        });
      }
      config = provider;
    }

    if (!config || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing provider configuration or test message',
        latency_ms: Date.now() - startTime
      });
    }

    // Test the LLM provider based on its type
    const result = await testLLMProvider(config, message);
    
    // Update test status in database if testing existing provider
    if (providerId) {
      await supabase
        .from('llm_providers')
        .update({
          last_tested_at: new Date().toISOString(),
          test_status: result.success ? 'success' : 'failed',
          test_error: result.success ? null : result.error
        })
        .eq('id', providerId)
        .eq('user_id', user.id);
    }

    return res.status(200).json({
      ...result,
      latency_ms: Date.now() - startTime
    });

  } catch (error) {
    console.error('LLM test API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      latency_ms: 0
    });
  }
}

async function testLLMProvider(config: any, message: string): Promise<LLMTestResponse> {
  const { provider_type } = config;

  try {
    switch (provider_type as LLMProviderType) {
      case 'gemini':
        return await testGemini(config, message);
      case 'azure_openai':
        return await testAzureOpenAI(config, message);
      case 'openai':
        return await testOpenAI(config, message);
      case 'custom':
        return await testCustomEndpoint(config, message);
      default:
        return {
          success: false,
          error: `Unsupported provider type: ${provider_type}`,
          latency_ms: 0
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency_ms: 0
    };
  }
}

async function testGemini(config: any, message: string): Promise<LLMTestResponse> {
  const { api_key, model_name } = config;
  
  if (!api_key || !model_name) {
    return {
      success: false,
      error: 'Missing required fields: api_key, model_name',
      latency_ms: 0
    };
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${api_key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: message }]
          }],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.1,
          }
        }),
      }
    );

    const data = await response.json();
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        latency_ms: latency
      };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        success: false,
        error: 'No response text received from Gemini',
        latency_ms: latency
      };
    }

    return {
      success: true,
      response: text,
      usage: data.usageMetadata ? {
        prompt_tokens: data.usageMetadata.promptTokenCount || 0,
        completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata.totalTokenCount || 0
      } : undefined,
      latency_ms: latency
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      latency_ms: Date.now() - startTime
    };
  }
}

async function testAzureOpenAI(config: any, message: string): Promise<LLMTestResponse> {
  const { api_key, azure_resource_name, azure_deployment_name, azure_api_version } = config;
  
  if (!api_key || !azure_resource_name || !azure_deployment_name || !azure_api_version) {
    return {
      success: false,
      error: 'Missing required fields: api_key, azure_resource_name, azure_deployment_name, azure_api_version',
      latency_ms: 0
    };
  }

  const startTime = Date.now();
  const endpoint = `https://${azure_resource_name}.openai.azure.com/openai/deployments/${azure_deployment_name}/chat/completions?api-version=${azure_api_version}`;
  
  console.log('Testing Azure OpenAI with endpoint:', endpoint);
  console.log('API key length:', api_key?.length);
  
  try {
    const requestBody = {
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: 100,
      temperature: 0.1,
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': api_key,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const latency = Date.now() - startTime;

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || data.message || `HTTP ${response.status}: ${response.statusText}. Full response: ${JSON.stringify(data)}`,
        latency_ms: latency
      };
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return {
        success: false,
        error: 'No response text received from Azure OpenAI',
        latency_ms: latency
      };
    }

    return {
      success: true,
      response: text,
      usage: data.usage,
      latency_ms: latency
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      latency_ms: Date.now() - startTime
    };
  }
}

async function testOpenAI(config: any, message: string): Promise<LLMTestResponse> {
  const { api_key, model_name, api_endpoint } = config;
  
  if (!api_key || !model_name) {
    return {
      success: false,
      error: 'Missing required fields: api_key, model_name',
      latency_ms: 0
    };
  }

  const startTime = Date.now();
  const endpoint = `${api_endpoint || 'https://api.openai.com/v1'}/chat/completions`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        model: model_name,
        messages: [
          { role: 'user', content: message }
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        latency_ms: latency
      };
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return {
        success: false,
        error: 'No response text received from OpenAI',
        latency_ms: latency
      };
    }

    return {
      success: true,
      response: text,
      usage: data.usage,
      latency_ms: latency
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      latency_ms: Date.now() - startTime
    };
  }
}

async function testCustomEndpoint(config: any, message: string): Promise<LLMTestResponse> {
  const { api_endpoint, model_name, api_key } = config;
  
  if (!api_endpoint || !model_name) {
    return {
      success: false,
      error: 'Missing required fields: api_endpoint, model_name',
      latency_ms: 0
    };
  }

  const startTime = Date.now();
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (api_key) {
      headers['Authorization'] = `Bearer ${api_key}`;
    }

    const response = await fetch(`${api_endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model_name,
        messages: [
          { role: 'user', content: message }
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const latency = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        latency_ms: latency
      };
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return {
        success: false,
        error: 'No response text received from custom endpoint',
        latency_ms: latency
      };
    }

    return {
      success: true,
      response: text,
      usage: data.usage,
      latency_ms: latency
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      latency_ms: Date.now() - startTime
    };
  }
}
