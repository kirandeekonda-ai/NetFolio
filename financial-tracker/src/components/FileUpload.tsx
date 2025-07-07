import { FC, useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { ACCEPTED_MIME_TYPES, ACCEPTED_EXTENSIONS } from '@/utils/fileTypes';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  maxSize?: number;
  disabled?: boolean;
}

export const FileUpload: FC<FileUploadProps> = ({
  onFileSelect,
  maxSize = 5242880, // 5MB
  disabled = false,
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
    disabled,
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
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${isDragActive && !disabled ? 'border-primary bg-primary/5 scale-105' : 'border-neutral-200'}
          ${isDragReject ? 'border-accent bg-accent/5' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium">
              {disabled ? 'Select a template first' : 'Drag & drop your file here'}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {disabled ? 'Choose a bank template above to enable file upload' : 'or click to browse'}
            </p>
          </div>
          
          <Button variant="secondary" size="sm" disabled={disabled}>
            Choose File
          </Button>

          <div className="text-sm text-neutral-500">
            Supported formats: CSV, Excel, PDF
          </div>
        </div>
      </div>

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
