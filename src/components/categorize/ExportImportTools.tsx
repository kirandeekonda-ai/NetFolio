import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { Transaction, Category } from '@/types';
import { formatAmount } from '@/utils/currency';

interface ExportImportToolsProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  onImportCategories: (categorizations: { transactionId: string; categoryName: string }[]) => Promise<void>;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export const ExportImportTools: React.FC<ExportImportToolsProps> = ({
  transactions,
  categories,
  currency,
  onImportCategories
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportFormats: ExportFormat[] = [
    {
      id: 'csv',
      name: 'CSV',
      description: 'Excel-compatible spreadsheet format',
      icon: '📊'
    },
    {
      id: 'json',
      name: 'JSON',
      description: 'Machine-readable format for backup',
      icon: '🔧'
    },
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Formatted categorization report',
      icon: '📄'
    }
  ];

  const exportToCSV = (transactionsToExport: Transaction[]) => {
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Category',
      'Transaction Type',
      'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...transactionsToExport.map(txn => [
        new Date(txn.transaction_date).toLocaleDateString(),
        `"${txn.description.replace(/"/g, '""')}"`,
        txn.amount?.toString() || '0',
        `"${txn.category_name || 'Uncategorized'}"`,
        (txn.amount || 0) > 0 ? 'Credit' : 'Debit',
        (txn.category_name && txn.category_name !== 'Uncategorized') ? 'Categorized' : 'Uncategorized'
      ].join(','))
    ].join('\n');

    return csvContent;
  };

  const exportToJSON = (transactionsToExport: Transaction[]) => {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalTransactions: transactionsToExport.length,
        categorizedCount: transactionsToExport.filter(t => t.category_name && t.category_name !== 'Uncategorized').length,
        currency: currency
      },
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        transactionCount: transactionsToExport.filter(t => t.category_name === cat.name).length
      })),
      transactions: transactionsToExport.map(txn => ({
        id: txn.id,
        date: txn.transaction_date,
        description: txn.description,
        amount: txn.amount,
        category: txn.category_name || 'Uncategorized',
        type: (txn.amount || 0) > 0 ? 'credit' : 'debit'
      }))
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generatePDFReport = async (transactionsToExport: Transaction[]) => {
    // Simple HTML-based PDF generation
    const categorizedTxns = transactionsToExport.filter(t => t.category_name && t.category_name !== 'Uncategorized');
    const uncategorizedTxns = transactionsToExport.filter(t => !t.category_name || t.category_name === 'Uncategorized');
    
    const categoryStats = categories.map(cat => {
      const categoryTxns = transactionsToExport.filter(t => t.category_name === cat.name);
      const totalAmount = categoryTxns.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      return {
        name: cat.name,
        count: categoryTxns.length,
        totalAmount,
        averageAmount: categoryTxns.length > 0 ? totalAmount / categoryTxns.length : 0
      };
    }).filter(stat => stat.count > 0).sort((a, b) => b.totalAmount - a.totalAmount);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>NetFolio Categorization Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
          .category-breakdown { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          th { background-color: #f8f9fa; }
          .amount-credit { color: #059669; }
          .amount-debit { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NetFolio Categorization Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>${transactionsToExport.length}</h3>
            <p>Total Transactions</p>
          </div>
          <div class="stat-card">
            <h3>${categorizedTxns.length}</h3>
            <p>Categorized</p>
          </div>
          <div class="stat-card">
            <h3>${uncategorizedTxns.length}</h3>
            <p>Uncategorized</p>
          </div>
        </div>

        <div class="category-breakdown">
          <h2>Category Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Transactions</th>
                <th>Total Amount</th>
                <th>Average Amount</th>
              </tr>
            </thead>
            <tbody>
              ${categoryStats.map(stat => `
                <tr>
                  <td>${stat.name}</td>
                  <td>${stat.count}</td>
                  <td>${formatAmount(stat.totalAmount, currency)}</td>
                  <td>${formatAmount(stat.averageAmount, currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div>
          <h2>Recent Transactions</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsToExport.slice(0, 50).map(txn => `
                <tr>
                  <td>${new Date(txn.transaction_date).toLocaleDateString()}</td>
                  <td>${txn.description}</td>
                  <td class="${(txn.amount || 0) > 0 ? 'amount-credit' : 'amount-debit'}">
                    ${formatAmount(txn.amount || 0, currency)}
                  </td>
                  <td>${txn.category_name || 'Uncategorized'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${transactionsToExport.length > 50 ? `<p><em>Showing first 50 transactions. Total: ${transactionsToExport.length}</em></p>` : ''}
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  const handleExport = async (format: string, selectedOnly = false) => {
    setIsExporting(true);
    try {
      const transactionsToExport = selectedOnly 
        ? transactions.filter(t => new Set().has(t.id)) // This would use actual selected transactions
        : transactions;

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          content = exportToCSV(transactionsToExport);
          filename = `netfolio-transactions-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = exportToJSON(transactionsToExport);
          filename = `netfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'pdf':
          content = await generatePDFReport(transactionsToExport);
          filename = `netfolio-report-${new Date().toISOString().split('T')[0]}.html`;
          mimeType = 'text/html';
          break;
        default:
          throw new Error('Unsupported format');
      }

      // Download the file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const content = await file.text();
      let categorizations: { transactionId: string; categoryName: string }[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        
        const idIndex = headers.findIndex(h => h.toLowerCase().includes('id'));
        const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
        
        if (idIndex === -1 || categoryIndex === -1) {
          throw new Error('CSV must contain ID and Category columns');
        }

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length > Math.max(idIndex, categoryIndex)) {
            categorizations.push({
              transactionId: values[idIndex].replace(/"/g, ''),
              categoryName: values[categoryIndex].replace(/"/g, '')
            });
          }
        }
      } else if (file.name.endsWith('.json')) {
        // Parse JSON
        const data = JSON.parse(content);
        if (data.transactions && Array.isArray(data.transactions)) {
          categorizations = data.transactions
            .filter((t: any) => t.id && t.category)
            .map((t: any) => ({
              transactionId: t.id,
              categoryName: t.category
            }));
        }
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      const result = await onImportCategories(categorizations);
      setImportResult({
        success: categorizations.length,
        failed: 0,
        errors: []
      });

    } catch (error) {
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl border border-white/20 p-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
          <span className="text-xl">📁</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Export & Import</h3>
          <p className="text-sm text-gray-600">Backup and restore your categorization data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 mb-3">📤 Export Data</h4>
          
          {exportFormats.map(format => (
            <div key={format.id} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{format.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{format.name}</div>
                  <div className="text-xs text-gray-600">{format.description}</div>
                </div>
              </div>
              <Button
                onClick={() => handleExport(format.id)}
                variant="secondary"
                className="text-sm"
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          ))}

          <div className="text-xs text-gray-500 mt-3">
            <p>• CSV files can be opened in Excel or Google Sheets</p>
            <p>• JSON files are ideal for backup and data migration</p>
            <p>• PDF reports provide formatted summaries</p>
          </div>
        </div>

        {/* Import Section */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 mb-3">📥 Import Categories</h4>
          
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50/50">
            <div className="space-y-3">
              <div className="text-3xl opacity-50">📁</div>
              <div>
                <p className="text-sm font-medium text-gray-500">Import Categorization Data</p>
                <p className="text-xs text-gray-400 mt-1">CSV or JSON files supported</p>
              </div>
              <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                🚧 Coming Soon
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This feature is currently in development and will be available in a future update.
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-400 space-y-1 opacity-75">
            <p><strong>Planned Features:</strong></p>
            <p>• Import categories from CSV files with transaction ID and category columns</p>
            <p>• Support for JSON format with the same structure as exported data</p>
            <p>• Validation to ensure only matching transaction IDs are updated</p>
            <p>• Progress tracking and error reporting during import</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {transactions.length} total transactions • {transactions.filter(t => t.category_name && t.category_name !== 'Uncategorized').length} categorized
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => handleExport('csv')}
              variant="secondary"
              className="text-sm"
            >
              Quick CSV Export
            </Button>
            <Button
              onClick={() => handleExport('json')}
              variant="primary"
              className="text-sm"
            >
              Backup All Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
