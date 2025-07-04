declare module 'pdfjs-dist' {
  export * from 'pdfjs-dist/types/src/display/api';
  export * from 'pdfjs-dist/types/src/display/display_utils';
  export * from 'pdfjs-dist/types/src/display/worker_options';
}

declare module 'pdfjs-dist/build/pdf.worker.min.js' {
  const content: any;
  export default content;
}

declare module '*.worker.js' {
  const content: any;
  export default content;
}
