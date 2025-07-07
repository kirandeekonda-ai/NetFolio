import { NextPage } from 'next';
import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { FileUpload } from '@/components/FileUpload';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { setTransactions } from '@/store/transactionsSlice';
import Papa from 'papaparse';
import { Transaction } from '@/types';
// Removed static import of parsePdfDocument to avoid SSR evaluation
import { getFileTypeFromExtension } from '@/utils/fileTypes';

const Upload: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      let transactions: Transaction[] = [];
      const fileType = getFileTypeFromExtension(file.name);

      // For CSV files
      if (fileType === 'text/csv') {
        await new Promise((resolve) => {
          Papa.parse<string[]>(file, {
            complete: (results: Papa.ParseResult<string[]>) => {
              transactions = results.data
                .slice(1)
                .map((row: string[], index: number) => ({
                  id: `tr-${index}`,
                  date: row[0],
                  description: row[1],
                  amount: parseFloat(row[2]),
                  type: parseFloat(row[2]) > 0 ? 'income' as const : 'expense' as const,
                  category: '',
                }));
              resolve(null);
            },
            header: true,
          });
        });
      } 
      // For PDF files
      else if (fileType === 'application/pdf') {
        try {
          // Dynamically import the PDF parsing logic in the browser
          const { parsePdfDocument } = await import('@/components/PdfParser');
          transactions = await parsePdfDocument(file);
        } catch (error) {
          console.error('Error parsing PDF:', error);
          return;
        }
      }
      // For Excel files (to be implemented)
      else if (fileType?.includes('excel')) {
        // Excel implementation will go here
        console.log('Excel support coming soon');
        return;
      }
      // For Excel files, you would need to use a library like xlsx

      if (transactions.length > 0) {
        dispatch(setTransactions(transactions));
        router.push('/categorize');
      }
    } catch (err) {
      console.error('Error processing file:', err);
      // You might want to show an error message to the user here
    }
  }, [dispatch, router]);

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-heading font-bold mb-6">
          Upload Bank Statement
        </h1>

        <Card className="p-6">
          <FileUpload
            onFileSelect={handleFileSelect}
            maxSize={5 * 1024 * 1024} // 5MB
          />
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm text-neutral-500"
        >
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Upload your bank statement in CSV, Excel, or PDF format</li>
            <li>File should contain Date, Description, and Amount columns</li>
            <li>Maximum file size is 5MB</li>
            <li>All data is processed locally in your browser</li>
          </ul>
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default Upload;
