/**
 * Simple PDF text extraction endpoint (fallback)
 * Returns full text content from PDF for single-page processing
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

interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    fileSize: number;
    fileName: string;
    processedAt: string;
    textLength: number;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API: /api/pdf/extract hit');
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

    console.log('Processing PDF for text extraction:', {
      fileName: uploadedFile.originalFilename,
      fileSize: uploadedFile.size,
      filePath: uploadedFile.filepath
    });

    // Extract text from PDF
    // Extract text from PDF
    const dataBuffer = fs.readFileSync(uploadedFile.filepath);
    const data = new Uint8Array(dataBuffer);



    const loadingTask = pdfjsLib.getDocument({
      data,
      password,
      disableFontFace: true,
      // Configure CMaps and Standard Fonts for better text extraction
      // pdfjs-dist requires trailing slash and often prefers forward slashes
      cMapUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/cmaps/').replace(/\\/g, '/') + '/',
      cMapPacked: true,
      standardFontDataUrl: path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/') + '/',
    });

    const doc = await loadingTask.promise;
    const numPages = doc.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      let lastY, text = '';
      // @ts-ignore
      for (const _item of textContent.items) {
        const item = _item as any;
        if (!item.str) continue;
        if (lastY == item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      fullText += text + '\n\n';
    }

    const cleanText = fullText.replace(/\s+/g, ' ').trim();

    const result: PDFExtractionResult = {
      text: cleanText,
      pageCount: numPages,
      metadata: {
        fileSize: uploadedFile.size || 0,
        fileName: uploadedFile.originalFilename || 'unknown.pdf',
        processedAt: new Date().toISOString(),
        textLength: cleanText.length
      }
    };



    // Clean up temporary file
    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp file:', cleanupError);
    }

    console.log('PDF text extraction successful:', {
      pageCount: result.pageCount,
      textLength: result.metadata.textLength
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('Error in PDF text extraction endpoint:', error);

    // Check if this is a password-protected PDF
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isPasswordProtected = (
      errorMessage.includes('PasswordException') ||
      errorMessage.includes('No password given') ||
      errorMessage.includes('password required') ||
      errorMessage.includes('Password required') ||
      errorMessage.includes('encrypted') ||
      errorMessage.includes('Encrypted') ||
      (error as any)?.code === 1
    );

    if (isPasswordProtected) {
      console.log('🔐 Password-protected PDF detected in fallback extraction');
      return res.status(422).json({
        error: 'PASSWORD_PROTECTED_PDF',
        text: '',
        pageCount: 0,
        metadata: {
          fileSize: 0,
          fileName: 'unknown',
          processedAt: new Date().toISOString(),
          textLength: 0
        }
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract PDF text',
      text: '',
      pageCount: 0,
      metadata: {
        fileSize: 0,
        fileName: 'unknown',
        processedAt: new Date().toISOString(),
        textLength: 0
      }
    });
  }
}
