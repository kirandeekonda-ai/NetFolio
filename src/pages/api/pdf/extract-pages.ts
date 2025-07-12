/**
 * API endpoint for extracting text from PDF pages
 * Returns an array of page contents for page-by-page processing
 */

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface PDFPageExtractionResult {
  pages: string[];
  pageCount: number;
  metadata: {
    fileSize: number;
    fileName: string;
    processedAt: string;
    avgPageLength: number;
  };
  error?: string;
}

const extractTextFromPDFByPages = async (filePath: string, fileName: string, fileSize: number): Promise<PDFPageExtractionResult> => {
  try {
    console.log('Starting PDF page extraction for:', fileName);
    
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    
    console.log(`PDF loaded with ${pdfData.numpages} pages`);
    console.log('Raw PDF text length:', pdfData.text.length);
    console.log('First 500 chars of raw text:', pdfData.text.substring(0, 500));
    
    // Split the full text into logical pages
    // Since pdf-parse doesn't give us page boundaries, we'll use heuristics
    const fullText = pdfData.text;
    const pages = splitTextIntoPages(fullText, pdfData.numpages);
    
    console.log('Pages after splitting:');
    pages.forEach((page, index) => {
      console.log(`Page ${index + 1} length: ${page.length}`);
      console.log(`Page ${index + 1} first 200 chars:`, page.substring(0, 200));
    });
    
    const avgPageLength = pages.reduce((sum, page) => sum + page.length, 0) / pages.length;
    
    console.log(`PDF page extraction completed. ${pages.length} logical pages extracted`);
    
    return {
      pages,
      pageCount: pages.length,
      metadata: {
        fileSize,
        fileName,
        processedAt: new Date().toISOString(),
        avgPageLength: Math.round(avgPageLength)
      }
    };
  } catch (error) {
    console.error('Error in PDF page extraction:', error);
    return {
      pages: [],
      pageCount: 0,
      metadata: {
        fileSize,
        fileName,
        processedAt: new Date().toISOString(),
        avgPageLength: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Split text into logical pages using heuristics
 * This is a fallback since pdf-parse doesn't provide page boundaries
 */
const splitTextIntoPages = (text: string, estimatedPageCount: number): string[] => {
  console.log('Splitting text into pages. Original length:', text.length, 'Estimated pages:', estimatedPageCount);
  
  // Less aggressive cleaning - preserve line breaks and structure
  const cleanText = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim(); // Only remove excessive empty lines
  console.log('After cleaning, length:', cleanText.length);
  
  if (estimatedPageCount <= 1) {
    console.log('Single page detected, returning as-is');
    return [cleanText];
  }

  // Try to find natural page breaks - look for common bank statement patterns
  const pageBreakIndicators = [
    /Page \d+ of \d+/gi,
    /Page \d+/gi,
    /Statement Date:/gi,
    /Statement Period:/gi,
    /Account Summary/gi,
    /Transaction Details/gi,
    /ACCOUNT STATEMENT/gi,
    /BANK STATEMENT/gi,
    /Beginning Balance/gi,
    /Ending Balance/gi
  ];

  let pages: string[] = [];
  let remainingText = cleanText;

  console.log('Looking for page break indicators...');
  
  // Look for page break indicators
  for (const indicator of pageBreakIndicators) {
    const matches = [...remainingText.matchAll(indicator)];
    console.log(`Found ${matches.length} matches for pattern:`, indicator.source);
    
    if (matches.length > 1) {
      // Found multiple matches, use them as page boundaries
      const chunks: string[] = [];
      let lastIndex = 0;
      
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (match.index !== undefined) {
          if (i === 0) {
            // For the first match, include everything from the beginning
            const chunk = remainingText.substring(0, match.index + match[0].length).trim();
            if (chunk.length > 50) { // Lowered threshold to include more content
              chunks.push(chunk);
              console.log(`Added chunk ${chunks.length}: ${chunk.length} chars`);
            }
            lastIndex = match.index + match[0].length;
          } else {
            // For subsequent matches, add content between previous and current match
            const chunk = remainingText.substring(lastIndex, match.index + match[0].length).trim();
            if (chunk.length > 50) {
              chunks.push(chunk);
              console.log(`Added chunk ${chunks.length}: ${chunk.length} chars`);
            }
            lastIndex = match.index + match[0].length;
          }
        }
      }
      
      // Add the remaining text after the last match
      const finalChunk = remainingText.substring(lastIndex).trim();
      if (finalChunk.length > 50) {
        chunks.push(finalChunk);
        console.log(`Added final chunk: ${finalChunk.length} chars`);
      }
      
      if (chunks.length > 1) {
        pages = chunks;
        console.log(`Successfully split into ${pages.length} pages using pattern:`, indicator.source);
        break;
      }
    }
  }

  // If no natural breaks found, split by estimated size but preserve structure
  if (pages.length === 0) {
    console.log('No natural page breaks found, using size-based splitting');
    
    const avgPageSize = Math.ceil(cleanText.length / estimatedPageCount);
    const minPageSize = Math.max(300, avgPageSize * 0.3); // Lowered minimum to preserve more content
    
    console.log(`Target page size: ${avgPageSize}, minimum: ${minPageSize}`);
    
    pages = [];
    let currentPosition = 0;
    
    while (currentPosition < cleanText.length) {
      let endPosition = Math.min(currentPosition + avgPageSize, cleanText.length);
      
      // Try to break at a natural boundary (sentence, paragraph, line break)
      if (endPosition < cleanText.length) {
        const searchEnd = Math.min(endPosition + 300, cleanText.length); // Increased search window
        const naturalBreaks = ['\n\n', '. ', '\n', ';', ',', ' ']; // Added more break options
        
        for (const breakChar of naturalBreaks) {
          const breakIndex = cleanText.lastIndexOf(breakChar, searchEnd);
          if (breakIndex > currentPosition + minPageSize) {
            endPosition = breakIndex + breakChar.length;
            break;
          }
        }
      }
      
      const pageText = cleanText.substring(currentPosition, endPosition).trim();
      if (pageText.length > 0) {
        pages.push(pageText);
        console.log(`Size-based page ${pages.length}: ${pageText.length} chars`);
      }
      
      currentPosition = endPosition;
    }
  }

  // Ensure we have at least one page with the full content
  if (pages.length === 0) {
    console.log('All splitting methods failed, returning complete text as single page');
    pages = [cleanText];
  }

  // Verify we haven't lost significant content
  const totalExtractedLength = pages.reduce((sum, page) => sum + page.length, 0);
  const originalLength = cleanText.length;
  const contentLossPercentage = ((originalLength - totalExtractedLength) / originalLength) * 100;
  
  console.log(`Content verification: Original=${originalLength}, Extracted=${totalExtractedLength}, Loss=${contentLossPercentage.toFixed(1)}%`);
  
  if (contentLossPercentage > 10) {
    console.warn('Significant content loss detected! Returning original text as single page.');
    pages = [cleanText];
  }

  // Limit to reasonable number of pages (safety check)
  if (pages.length > 20) {
    console.warn(`Detected ${pages.length} pages, limiting to 10 for processing efficiency`);
    // Merge smaller pages together
    const mergedPages: string[] = [];
    const targetPageCount = 10;
    const pagesPerMerge = Math.ceil(pages.length / targetPageCount);
    
    for (let i = 0; i < pages.length; i += pagesPerMerge) {
      const pagesToMerge = pages.slice(i, i + pagesPerMerge);
      mergedPages.push(pagesToMerge.join('\n\n')); // Preserve some separation
    }
    
    pages = mergedPages;
  }

  console.log(`Final result: Split text into ${pages.length} pages`);
  pages.forEach((page, index) => {
    console.log(`Final page ${index + 1}: ${page.length} chars`);
  });
  
  return pages;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the uploaded file using formidable
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    if (!uploadedFile.originalFilename?.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    console.log('Processing PDF for page extraction:', {
      fileName: uploadedFile.originalFilename,
      fileSize: uploadedFile.size,
      filePath: uploadedFile.filepath
    });

    // Extract text from PDF pages
    const result = await extractTextFromPDFByPages(
      uploadedFile.filepath,
      uploadedFile.originalFilename || 'unknown.pdf',
      uploadedFile.size || 0
    );

    // Clean up temporary file
    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
    }

    if (result.error) {
      return res.status(500).json({
        error: result.error,
        pages: [],
        pageCount: 0,
        metadata: result.metadata
      });
    }

    console.log('PDF page extraction successful:', {
      pageCount: result.pageCount,
      avgPageLength: result.metadata.avgPageLength
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in PDF page extraction endpoint:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract PDF pages',
      pages: [],
      pageCount: 0,
      metadata: {
        fileSize: 0,
        fileName: 'unknown',
        processedAt: new Date().toISOString(),
        avgPageLength: 0
      }
    });
  }
}
