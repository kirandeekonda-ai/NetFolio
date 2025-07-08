import { FC, useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
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
        setError(`File is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError(`Invalid file type. Please upload a CSV, Excel, or PDF file`);
      } else {
        setError('Invalid file');
      }
    },
  });

  const formatMaxSize = () => {
    return Math.round(maxSize / 1024 / 1024);
  };

  return (
    <div className="w-full">
      <motion.div
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
      >
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
            ${disabled ? 'cursor-not-allowed opacity-50 bg-gray-50' : 'cursor-pointer'}
            ${isDragActive && !disabled ? 'border-emerald-400 bg-emerald-50 scale-105 shadow-lg' : 
              isDragReject ? 'border-red-400 bg-red-50' : 
              'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'}
          `}
        >
          <input {...getInputProps()} />
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Upload Icon */}
            <motion.div
              animate={{
                scale: isDragActive && !disabled ? 1.2 : 1,
                rotate: isDragActive && !disabled ? 360 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="flex justify-center"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isDragActive && !disabled ? 'bg-emerald-100' : 'bg-gray-100'
              }`}>
                <span className="text-4xl">
                  {isDragActive && !disabled ? '🎯' : disabled ? '🔒' : '�'}
                </span>
              </div>
            </motion.div>

            {/* Main Message */}
            <div>
              <h3 className={`text-xl font-semibold mb-2 ${
                disabled ? 'text-gray-400' : 
                isDragActive ? 'text-emerald-600' : 'text-gray-700'
              }`}>
                {disabled ? 'Select a processing mode first' :
                 isDragActive ? 'Drop your file here!' : 
                 'Drag & drop your statement here'}
              </h3>
              <p className={`text-sm ${
                disabled ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {disabled ? 'Choose AI or Template mode above to enable file upload' : 
                 'or click to browse your files'}
              </p>
            </div>
            
            {/* Upload Button */}
            <Button 
              variant="primary" 
              disabled={disabled}
              className={`${
                disabled ? 'opacity-50 cursor-not-allowed' : 
                'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
              }`}
            >
              <span className="flex items-center space-x-2">
                <span>📁</span>
                <span>Choose File</span>
              </span>
            </Button>

            {/* File Type Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📄</span>
                  <span>PDF</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📊</span>
                  <span>CSV</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📈</span>
                  <span>Excel</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Maximum file size: {formatMaxSize()}MB
              </p>
            </div>
          </motion.div>

          {/* Drag Overlay */}
          <AnimatePresence>
            {isDragActive && !disabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500 bg-opacity-10 rounded-xl flex items-center justify-center"
              >
                <div className="text-emerald-600 text-center">
                  <div className="text-6xl mb-2">🎯</div>
                  <p className="text-xl font-semibold">Drop it like it's hot!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
