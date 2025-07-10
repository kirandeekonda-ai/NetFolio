export const FILE_TYPES = {
  pdf: {
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
};

export const ACCEPTED_MIME_TYPES = {
  'application/pdf': [],
};

export const ACCEPTED_EXTENSIONS = ['.pdf'];

export const getFileTypeFromExtension = (filename: string): string | null => {
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) return null;
  
  if (extension === 'pdf') return 'application/pdf';
  
  return null;
};
