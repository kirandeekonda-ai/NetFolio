declare module 'pdfjs-dist/legacy/build/pdf' {
  import type { PDFDocumentProxy } from 'pdfjs-dist';
  export * from 'pdfjs-dist';
  const pdfjsLib: typeof import('pdfjs-dist');
  export default pdfjsLib;
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.entry' {
  const worker: string;
  export default worker;
}
