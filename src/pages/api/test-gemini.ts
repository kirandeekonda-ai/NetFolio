import { NextApiRequest, NextApiResponse } from 'next';
import { GeminiService } from '../../lib/llm/GeminiService';

interface TestResponse {
  success: boolean;
  error?: string;
  details?: {
    model: string;
    apiKeyPresent: boolean;
    testPrompt: string;
    response?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY environment variable is not set',
        details: {
          model: 'gemini-2.0-flash',
          apiKeyPresent: false,
          testPrompt: 'N/A - No API key'
        }
      });
    }

    const geminiService = new GeminiService(geminiApiKey);
    const testPrompt = 'Return a simple JSON object with a "message" field saying "Hello from Gemini"';
    
    try {
      // Test with a simple extraction to verify the service works
      const result = await geminiService.extractTransactions(testPrompt);
      
      return res.status(200).json({
        success: true,
        details: {
          model: 'gemini-2.0-flash',
          apiKeyPresent: true,
          testPrompt,
          response: `Processed successfully. Usage: ${result.usage.prompt_tokens} input tokens, ${result.usage.completion_tokens} output tokens`
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        details: {
          model: 'gemini-2.0-flash',
          apiKeyPresent: true,
          testPrompt,
          response: 'Failed to get response'
        }
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
