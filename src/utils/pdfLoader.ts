'use client';

import type { PDFDocumentProxy } from 'pdfjs-dist';

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used in the browser');
  }

  const pdfjs = await import('pdfjs-dist');

  // Use a CDN for the worker to avoid build issues
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  return loadingTask.promise;
}
