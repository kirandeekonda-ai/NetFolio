/**
 * Generic LLM processing endpoint
 * Routes requests to appropriate LLM providers (Gemini, OpenAI, etc.)
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  provider?: 'gemini' | 'openai' | 'custom';
}

interface LLMResponse {
  text: string;
  provider: string;
  tokens_used?: number;
  processing_time_ms: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, maxTokens = 1000, temperature = 0.3, provider = 'gemini' }: LLMRequest = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const startTime = Date.now();
    let response: LLMResponse;

    switch (provider) {
      case 'gemini':
        response = await processWithGemini(prompt, maxTokens, temperature);
        break;
      case 'openai':
        response = await processWithOpenAI(prompt, maxTokens, temperature);
        break;
      case 'custom':
        response = await processWithCustomEndpoint(prompt, maxTokens, temperature);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    response.processing_time_ms = Date.now() - startTime;

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in LLM processing:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'LLM processing failed',
      text: '',
      provider: 'error',
      processing_time_ms: 0
    });
  }
}

async function processWithGemini(prompt: string, maxTokens: number, temperature: number): Promise<LLMResponse> {
  try {
    // Use existing Gemini service
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      text,
      provider: 'gemini',
      tokens_used: text.length, // Approximate
      processing_time_ms: 0 // Will be set by caller
    };
  } catch (error) {
    throw new Error(`Gemini processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processWithOpenAI(prompt: string, maxTokens: number, temperature: number): Promise<LLMResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      text,
      provider: 'openai',
      tokens_used: tokensUsed,
      processing_time_ms: 0 // Will be set by caller
    };
  } catch (error) {
    throw new Error(`OpenAI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processWithCustomEndpoint(prompt: string, maxTokens: number, temperature: number): Promise<LLMResponse> {
  try {
    const customEndpoint = process.env.CUSTOM_LLM_ENDPOINT;
    
    if (!customEndpoint) {
      throw new Error('Custom LLM endpoint not configured');
    }

    const response = await fetch(customEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CUSTOM_LLM_API_KEY || ''}`,
      },
      body: JSON.stringify({
        prompt,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Custom LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.response || data.text || data.content || '';

    return {
      text,
      provider: 'custom',
      tokens_used: text.length, // Approximate
      processing_time_ms: 0 // Will be set by caller
    };
  } catch (error) {
    throw new Error(`Custom LLM processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
