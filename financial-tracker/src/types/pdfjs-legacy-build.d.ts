declare module 'pdfjs-dist/legacy/build/pdf' {
  import type { PDFDocumentProxy } from 'pdfjs-dist';
  const pdfjsLib: {
    version: string;
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (source: any) => { promise: Promise<PDFDocumentProxy> };
  };
  export default pdfjsLib;
}

declare module 'pdfjs-dist/legacy/build/pdf.worker.min.mjs' {
  const src: string;
  export default src;
}
