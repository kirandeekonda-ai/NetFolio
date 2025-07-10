import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';
import { createLLMProvider } from '../../../lib/llm/LLMProviderFactory';
import { createEnhancedLLMService } from '../../../lib/llm/EnhancedLLMService';
import { Transaction } from '../../../lib/llm/types';
import { createSupabaseServerClient } from '@/utils/supabase';
import { Category } from '@/types';

// Disable Next.js default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ProcessingAnalytics {
  pagesProcessed: number;
  inputTokens: number;
  outputTokens: number;
}

interface APIResponse {
  transactions: Transaction[];
  analytics: ProcessingAnalytics;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB in bytes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get user's default active LLM provider
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
        return res.status(400).json({ 
          error: 'No AI provider configured. Please set up an LLM provider in your profile settings to use AI-powered PDF processing.',
          details: 'Go to Profile → LLM Provider Configuration to add and configure an AI provider (Google Gemini, Azure OpenAI, etc.)'
        });
      }

      // Use the first available active provider
      return await processWithProvider(req, res, anyProvider, user);
    }

    return await processWithProvider(req, res, provider, user);
  } catch (error) {
    console.error('Error in PDF processing:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processWithProvider(
  req: NextApiRequest, 
  res: NextApiResponse<APIResponse | ErrorResponse>,
  providerConfig: any,
  user: any
) {
  try {
    const supabase = createSupabaseServerClient(req, res);
    
    // Debug: Log user information
    console.log('🔍 PDF API - User ID:', user.id);
    console.log('🔍 PDF API - User email:', user.email);
    
    // Fetch user's categories from user_preferences (same as categorize page)
    let categories: Category[] = [];
    try {
      console.log('🔍 PDF API - Querying user_preferences for user_id:', user.id);
      const { data: userPreferences, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('categories')
        .eq('user_id', user.id)
        .single();

      if (preferencesError) {
        console.error('❌ Error fetching user preferences from Supabase:', preferencesError);
      } else {
        console.log('✅ PDF API - User preferences query successful, raw data:', userPreferences);
        categories = userPreferences?.categories || [];
      }
      
      console.log(`📂 PDF API - Found ${categories.length} user categories from preferences for personalized extraction`);
      if (categories.length > 0) {
        console.log('📂 PDF API - Category names:', categories.map((cat: Category) => cat.name));
      } else {
        console.log('⚠️ PDF API - No user categories found in preferences, will use default examples');
      }
    } catch (categoriesError) {
      console.error('❌ Error fetching user categories from user_preferences:', categoriesError);
      console.log('⚠️ PDF API - Continuing with empty categories due to fetch error');
    }

    // Parse the multipart form data
    const { file } = await parseForm(req);
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type and size
    if (!file.mimetype?.includes('pdf') && !file.originalFilename?.endsWith('.pdf')) {
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB` 
      });
    }

    // Read and parse PDF
    const pdfBuffer = fs.readFileSync(file.filepath);
    const pdfData = await pdf(pdfBuffer);
    
    // Clean up temporary file
    fs.unlinkSync(file.filepath);

    // Initialize Enhanced LLM service (automatically chooses between custom endpoint and production)
    const llmService = createEnhancedLLMService(providerConfig);

    // Log provider information for debugging
    const providerInfo = llmService.getProviderInfo();
    console.log('Using LLM provider:', providerInfo.type, providerInfo.isCustomEndpoint ? '(Custom Endpoint)' : '(Production)');

    // Process the PDF text
    const allTransactions: Transaction[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let pagesProcessed = 0;
    
    const pageText = pdfData.text;
    if (pageText.trim()) {
      try {
        console.log(`🚀 PDF API - Calling LLM service with ${categories.length} user categories`);
        const result = await llmService.extractTransactions(pageText, categories);
        allTransactions.push(...result.transactions);
        totalInputTokens += result.usage.prompt_tokens;
        totalOutputTokens += result.usage.completion_tokens;
        pagesProcessed = 1; // For now, treating entire PDF as one page
      } catch (error) {
        console.error('Error processing page:', error);
        throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Remove duplicate transactions
    const uniqueTransactions = removeDuplicateTransactions(allTransactions);

    const analytics: ProcessingAnalytics = {
      pagesProcessed,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };

    return res.status(200).json({
      transactions: uniqueTransactions,
      analytics,
    });

  } catch (error) {
    console.error('Error processing PDF with provider:', error);
    return res.status(500).json({
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function parseForm(req: NextApiRequest): Promise<{ file: formidable.File | null }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const fileArray = files.file;
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      
      resolve({ file: file || null });
    });
  });
}

function removeDuplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  return transactions.filter(transaction => {
    const key = `${transaction.date}_${transaction.description}_${transaction.amount}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
