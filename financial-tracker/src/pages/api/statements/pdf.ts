import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';
import { GeminiService } from '../../../lib/llm/GeminiService';
import { Transaction } from '../../../lib/llm/types';

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

  // Check for required environment variables
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'GEMINI_API_KEY not configured'
    });
  }

  try {
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

    // Initialize Gemini service
    const geminiService = new GeminiService(geminiApiKey);

    // Process each page
    const allTransactions: Transaction[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let pagesProcessed = 0;

    // Split PDF into pages (pdf-parse doesn't provide page-by-page text directly)
    // For now, we'll process the entire text as one chunk
    // In a production environment, you might want to use a library like pdf2pic + OCR
    // or pdf-lib for more granular page extraction
    
    const pageText = pdfData.text;
    if (pageText.trim()) {
      try {
        const result = await geminiService.extractTransactions(pageText);
        allTransactions.push(...result.transactions);
        totalInputTokens += result.usage.prompt_tokens;
        totalOutputTokens += result.usage.completion_tokens;
        pagesProcessed = 1; // For now, treating entire PDF as one page
      } catch (error) {
        console.error('Error processing page:', error);
      }
    }

    // Remove duplicates and sort by date
    const uniqueTransactions = removeDuplicateTransactions(allTransactions);
    const sortedTransactions = uniqueTransactions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const response: APIResponse = {
      transactions: sortedTransactions,
      analytics: {
        pagesProcessed,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error processing PDF:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function parseForm(req: NextApiRequest): Promise<{ file: formidable.File | null }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) {
        reject(err);
        return;
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      resolve({ file: file || null });
    });
  });
}

function removeDuplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  return transactions.filter(transaction => {
    // Create a unique key based on date, amount, and description
    const key = `${transaction.date}-${transaction.amount}-${transaction.description.toLowerCase().trim()}`;
    
    if (seen.has(key)) {
      return false;
    }
    
    seen.add(key);
    return true;
  });
}
