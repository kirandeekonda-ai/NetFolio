export const FILE_TYPES = {
  csv: {
    extension: '.csv',
    mimeType: 'text/csv',
  },
  excel: {
    extensions: ['.xlsx', '.xls'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ],
  },
  pdf: {
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
};

export const ACCEPTED_MIME_TYPES = {
  'text/csv': [],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
  'application/vnd.ms-excel': [],
  'application/pdf': [],
};

export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.pdf'];

export const getFileTypeFromExtension = (filename: string): string | null => {
  const extension = filename.toLowerCase().split('.').pop();
  if (!extension) return null;
  
  if (extension === 'csv') return 'text/csv';
  if (extension === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (extension === 'xls') return 'application/vnd.ms-excel';
  if (extension === 'pdf') return 'application/pdf';
  
  return null;
};
