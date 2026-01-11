import type { NextApiRequest, NextApiResponse } from 'next';
import { createLLMProvider } from '../../../lib/llm/LLMProviderFactory';
import { LLMProvider as LLMProviderConfig } from '@/types/llm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { providerConfig } = req.body;

    if (!providerConfig) {
      return res.status(400).json({
        success: false,
        error: 'Provider configuration is required'
      });
    }

    console.log('Testing connection for provider:', providerConfig.provider_type);

    // Create the provider instance
    const provider = createLLMProvider(providerConfig as LLMProviderConfig);

    // Measure latency
    const startTime = Date.now();

    // Test the connection
    const result = await provider.testConnection();

    const latency_ms = Date.now() - startTime;

    if (result.success) {
      return res.status(200).json({
        success: true,
        latency_ms,
        result: 'Connection test successful'
      });
    } else {
      console.error('Connection test failed:', result.error);
      return res.status(200).json({ // Return 200 with success: false for handled errors
        success: false,
        error: result.error,
        latency_ms
      });
    }
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during test'
    });
  }
}
