'use client';

import { Transaction } from '@/types';
import { loadPdfDocument } from '@/utils/pdfLoader';

export async function parsePdfDocument(file: File): Promise<Transaction[]> {
  console.log('Starting PDF parsing...');
  if (typeof window === 'undefined') throw new Error('PDF parsing is browser-only');

  const pdf = await loadPdfDocument(file);
  console.log(`PDF loaded with ${pdf.numPages} pages.`);
  const transactions: Transaction[] = [];
  
  // Process each page
  for (let i = 1; i <= pdf.numPages; i++) {
    console.log(`Processing page ${i}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    console.log('Extracted text content items:', content.items.length);
    let currentDate = '';
    let buffer: { text: string, x: number, y: number }[] = [];

    // Sort items by y position (top to bottom) and then by x position (left to right)
    const items = content.items
      .filter((item: any) => item.str.trim().length > 0)
      .sort((a: any, b: any) => {
        const yDiff = b.transform[5] - a.transform[5];
        return yDiff === 0 ? a.transform[4] - b.transform[4] : yDiff;
      });
    console.log('Sorted and filtered text items:', items.length);

    for (const item of items) {
      const text = (item as any).str.trim();
      console.log(`Checking for date: "${text}"`);
      if (isDateString(text)) {
        console.log(`Found date string: ${text}`);
        if (buffer.length > 0 && currentDate) {
          console.log('Processing buffer for new date:', buffer.map(b => b.text));
          const { description, amount } = extractTransactionInfo(buffer);
          console.log(`Extracted transaction: { description: \'${description}\', amount: ${amount} }`);
          if (amount !== null) {
            transactions.push({
              id: `tr-${transactions.length}`,
              date: currentDate,
              description,
              amount,
              type: amount > 0 ? 'income' : 'expense',
              category: ''
            });
          }
          buffer = [];
        }
        currentDate = text;
      } else {
        buffer.push({ 
          text, 
          x: (item as any).transform[4], 
          y: (item as any).transform[5] 
        });
      }
    }

    // Process any remaining buffer at the end of the page
    if (buffer.length > 0 && currentDate) {
      console.log('Processing final buffer for page:', buffer.map(b => b.text));
      const { description, amount } = extractTransactionInfo(buffer);
      console.log(`Extracted transaction: { description: \'${description}\', amount: ${amount} }`);
      if (amount !== null) {
        transactions.push({
          id: `tr-${transactions.length}`,
          date: currentDate,
          description,
          amount,
          type: amount > 0 ? 'income' : 'expense',
          category: ''
        });
      }
    }
  }

  console.log('Finished PDF parsing. Total transactions found:', transactions.length);
  return transactions;
}

function isDateString(text: string): boolean {
  const datePattern = /^\d{2}-[A-Za-z]{3}-\d{4}$/;
  return datePattern.test(text.trim());
}

function extractTransactionInfo(buffer: { text: string, x: number, y: number }[]): { description: string, amount: number | null } {
  const text = buffer.map(b => b.text).join(' ');
  const amount = extractAmountFromText(text);
  return {
    description: amount ? text.replace(amount.toString(), '').trim() : text.trim(),
    amount
  };
}

function extractAmountFromText(text: string): number | null {
  const amountPattern = /(?:[-$]?\d{1,3}(?:,\d{3})*\.\d{2}|-\$?\d+\.\d{2}|\$?\d+\.\d{2})/;
  const match = text.match(amountPattern);
  if (match) {
    return parseFloat(match[0].replace(/[$,]/g, ''));
  }
  return null;
}
