import { Transaction } from '@/types';
import { initializePdfJs, getPdfJs } from './pdfSetup';

const extractAmountFromText = (text: string): number | null => {
  // Look for currency patterns like $123.45, -$123.45, 123.45, -123.45
  const amountPattern = /(?:[-$]?\d{1,3}(?:,\d{3})*\.\d{2}|-\$?\d+\.\d{2}|\$?\d+\.\d{2})/;
  const match = text.match(amountPattern);
  if (match) {
    // Remove $ and , from the amount and convert to number
    return parseFloat(match[0].replace(/[$,]/g, ''));
  }
  return null;
};

const isDateString = (text: string): boolean => {
  // Check for common date formats: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, etc.
  const datePattern = /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$|^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/;
  return datePattern.test(text.trim());
};

export const parsePdfToTransactions = async (file: File): Promise<Transaction[]> => {
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available in browser environment');
  }

  await initializePdfJs();
  const pdfjsLib = getPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
  const transactions: Transaction[] = [];
  
  // Process each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let currentDate = '';
    let buffer: { text: string, x: number, y: number }[] = [];

    // Sort items by y position (top to bottom) and then by x position (left to right)
    const items = content.items
      .filter((item: any) => item.str.trim().length > 0)
      .sort((a: any, b: any) => {
        const yDiff = b.transform[5] - a.transform[5];
        return yDiff === 0 ? a.transform[4] - b.transform[4] : yDiff;
      });

    for (const item of items) {
      const text = (item as any).str.trim();
      const x = (item as any).transform[4];
      const y = (item as any).transform[5];

      if (isDateString(text)) {
        // If we have buffered items, process them as a transaction
        if (buffer.length > 0 && currentDate) {
          const description = buffer.map(b => b.text).join(' ');
          const amount = extractAmountFromText(description);
          if (amount !== null) {
            transactions.push({
              id: `tr-${transactions.length}`,
              date: currentDate,
              description: description.replace(amount.toString(), '').trim(),
              amount: amount,
              type: amount > 0 ? 'income' : 'expense',
              category: ''
            });
          }
          buffer = [];
        }
        currentDate = text;
      } else {
        const amount = extractAmountFromText(text);
        if (amount !== null && currentDate && buffer.length > 0) {
          const description = buffer.map(b => b.text).join(' ');
          transactions.push({
            id: `tr-${transactions.length}`,
            date: currentDate,
            description: description.trim(),
            amount: amount,
            type: amount > 0 ? 'income' : 'expense',
            category: ''
          });
          buffer = [];
        } else {
          buffer.push({ text, x, y });
        }
      }
    }
  }

  return transactions;
};
