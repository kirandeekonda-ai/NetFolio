import { FC, useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { ACCEPTED_MIME_TYPES, ACCEPTED_EXTENSIONS } from '@/utils/fileTypes';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  maxSize?: number;
}

export const FileUpload: FC<FileUploadProps> = ({
  onFileSelect,
  maxSize = 5242880, // 5MB
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setError(null);
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
    maxSize,
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropRejected: (fileRejections: FileRejection[]) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError(`Invalid file type. Please upload a CSV, Excel, or PDF file`);
      } else {
        setError('Invalid file');
      }
    },
  });

  return (
    <div className="w-full">
      <motion.div
        {...getRootProps()}
        animate={{
          scale: isDragActive ? 1.02 : 1,
          borderColor: isDragActive ? '#5A67D8' : '#E2E8F0',
        }}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-neutral-200'}
          ${isDragReject ? 'border-accent bg-accent/5' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium">
              Drag & drop your file here
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              or click to browse
            </p>
          </div>
          
          <Button variant="secondary" size="sm">
            Choose File
          </Button>

          <div className="text-sm text-neutral-500">
            Supported formats: CSV, Excel, PDF
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-accent"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};
