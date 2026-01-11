/**
 * API endpoint for extracting text from PDF pages
 * Returns an array of page contents for page-by-page processing
 */

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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

const extractTextFromPDFByPages = async (filePath: string, fileName: string, fileSize: number, password?: string): Promise<PDFPageExtractionResult> => {
  try {
    console.log('Starting PDF page extraction (via pdfjs-dist) for:', fileName);

    const dataBuffer = fs.readFileSync(filePath);
    const data = new Uint8Array(dataBuffer);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data,
      password,
      // Disable worker for Node environment
      disableFontFace: true,
      // Configure CMaps and Standard Fonts for better text extraction
      // pdfjs-dist requires trailing slash and often prefers forward slashes
      cMapUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/').replace(/\\/g, '/') + '/',
      cMapPacked: true,
      standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/') + '/',
    });

    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    console.log(`PDF loaded with ${numPages} pages using pdfjs-dist`);

    const pages: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();

      // Simple text extraction preserving lines based on Y position
      let lastY, text = '';
      // @ts-ignore
      for (const item of textContent.items) {
        if (!item.str) continue;

        // Check if Y position changed (new line)
        // Note: transform[5] is Y coordinate
        if (lastY == item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      pages.push(text);
    }

    const avgPageLength = pages.reduce((sum, page) => sum + page.length, 0) / (pages.length || 1);

    console.log(`PDF page extraction completed. ${pages.length} pages extracted`);

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

    // Debug logging to file
    try {
      const debugPath = path.join(process.cwd(), 'pdf-debug.log');
      fs.appendFileSync(debugPath, `\n[${new Date().toISOString()}] Error extracting ${fileName}: ${error instanceof Error ? error.message : String(error)}\nStack: ${error instanceof Error ? error.stack : 'No stack'}\n`);
    } catch (e) {
      console.error('Failed to write debug log', e);
    }

    // Check if this is a password-protected PDF
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isPasswordProtected = (
      errorMessage.includes('PasswordException') ||
      errorMessage.includes('No password given') ||
      errorMessage.includes('password required') ||
      errorMessage.includes('Password required') ||
      errorMessage.includes('encrypted') ||
      errorMessage.includes('Encrypted') ||
      (error as any)?.code === 1 ||
      errorMessage.includes('Password') ||
      (error as any)?.name === 'PasswordException'
    );

    if (isPasswordProtected) {
      console.log('🔐 Password-protected PDF detected');
      return {
        pages: [],
        pageCount: 0,
        metadata: {
          fileSize,
          fileName,
          processedAt: new Date().toISOString(),
          avgPageLength: 0
        },
        error: 'PASSWORD_PROTECTED_PDF'
      };
    }

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API: /api/pdf/extract-pages hit');
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
    const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;

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
      uploadedFile.size || 0,
      password
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
