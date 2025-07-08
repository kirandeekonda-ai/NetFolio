import { NextApiRequest, NextApiResponse } from 'next';
import { GeminiService } from '../../lib/llm/GeminiService';

interface HealthResponse {
  status: 'ok' | 'error';
  services: {
    gemini: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key';
    pdf_processing: 'available';
  };
  timestamp: string;
  details?: string;
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
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    let geminiStatus: 'available' | 'not_configured' | 'connection_failed' | 'invalid_key' = 'not_configured';
    let details = '';

    if (!geminiApiKey) {
      geminiStatus = 'not_configured';
      details = 'GEMINI_API_KEY environment variable is not set';
    } else {
      // Test the actual connection
      try {
        const geminiService = new GeminiService(geminiApiKey);
        const testResult = await geminiService.testConnection();
        
        if (testResult.success) {
          geminiStatus = 'available';
          details = 'Gemini API connection successful';
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
    
    const response: HealthResponse = {
      status: geminiStatus === 'available' ? 'ok' : 'error',
      services: {
        gemini: geminiStatus,
        pdf_processing: 'available'
      },
      timestamp: new Date().toISOString(),
      details
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
