import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';

let initialized = false;

export async function initializePdfJs() {
  if (initialized) return;
  
  if (typeof window === 'undefined') return;

  try {
    // Set worker source URL directly using CDN
    GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize PDF.js worker:', error);
    throw new Error('Failed to initialize PDF.js worker');
  }
}

export function getPdfJs() {
  if (!initialized) {
    throw new Error('PDF.js not initialized. Call initializePdfJs() first.');
  }
  return { getDocument, GlobalWorkerOptions };
}
