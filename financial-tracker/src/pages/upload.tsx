import { NextPage } from 'next';
import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/Card';
import { FileUpload } from '@/components/FileUpload';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { setTransactions } from '@/store/transactionsSlice';
import Papa from 'papaparse';
import { Transaction } from '@/types';
import { getFileTypeFromExtension } from '@/utils/fileTypes';
import { bankStatementParser } from '@/utils/bankStatementParser';

const Upload: NextPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ identifier: string, bankName: string, format: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load available templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await bankStatementParser.getAvailableTemplates();
        setAvailableTemplates(templates.map(t => ({
          identifier: t.identifier,
          bankName: t.bank_name,
          format: t.format
        })));
        // Set default template to DBS if available
        const dbsTemplate = templates.find(t => t.identifier === 'dbs_pdf_v1');
        if (dbsTemplate) {
          setSelectedTemplate(dbsTemplate.identifier);
        }
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load bank templates');
      }
    };

    loadTemplates();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!selectedTemplate) {
      setError('Please select a bank template first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let transactions: Transaction[] = [];
      const fileType = getFileTypeFromExtension(file.name);

      // For PDF files - use the new template system
      if (fileType === 'application/pdf') {
        const result = await bankStatementParser.parseStatement(file, selectedTemplate);
        if (result.success) {
          transactions = result.transactions;
        } else {
          setError(result.error || 'Failed to parse PDF file');
          return;
        }
      } 
      // For CSV files - keep existing logic for now, will be updated later
      else if (fileType === 'text/csv') {
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
      // For Excel files (to be implemented)
      else if (fileType?.includes('excel')) {
        setError('Excel support coming soon');
        return;
      }
      else {
        setError('Unsupported file format');
        return;
      }

      if (transactions.length > 0) {
        console.log('Successfully extracted transactions:', transactions.length);
        console.log('Sample transaction:', transactions[0]);
        dispatch(setTransactions(transactions));
        router.push('/categorize');
      } else {
        console.warn('No transactions found in the file');
        setError('No transactions found in the file');
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, router, selectedTemplate]);

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

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Bank Template</h2>
          <div className="mb-4">
            <label htmlFor="template-select" className="block text-sm font-medium mb-2">
              Bank Template:
            </label>
            <select
              id="template-select"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">Select a template...</option>
              {availableTemplates.map(template => (
                <option key={template.identifier} value={template.identifier}>
                  {template.bankName} ({template.format})
                </option>
              ))}
            </select>
          </div>
          {selectedTemplate && (
            <div className="text-sm text-gray-600">
              Selected: {availableTemplates.find(t => t.identifier === selectedTemplate)?.bankName} - {availableTemplates.find(t => t.identifier === selectedTemplate)?.format}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <FileUpload
            onFileSelect={handleFileSelect}
            maxSize={5 * 1024 * 1024} // 5MB
            disabled={isLoading || !selectedTemplate}
          />
          {isLoading && (
            <div className="mt-4 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-600">Processing file...</p>
            </div>
          )}
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm text-neutral-500"
        >
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Select the appropriate bank template for your statement</li>
            <li>Upload your bank statement in CSV, Excel, or PDF format</li>
            <li>The system will automatically extract transactions based on the selected template</li>
            <li>Review and categorize the imported transactions on the next page</li>
            <li>Maximum file size is 5MB</li>
            <li>All data is processed locally in your browser</li>
          </ul>
        </motion.div>
      </motion.div>
    </Layout>
  );
};

export default Upload;
