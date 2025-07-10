import { Transaction } from '@/types';
import { loadPdfDocument } from '@/utils/pdfLoader';

// Type definitions for PDF parsing
interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
}

interface TableRow {
  y: number;
  items: TextItem[];
}

interface ColumnBoundaries {
  positions: { [key: string]: { x: number; width: number } };
  y: number;
}

interface ParserConfig {
  type: string;
  headers: string[];
  dateColumn: string;
  dateFormat: string;
  amountColumns: {
    debit: string;
    credit: string;
  };
  descriptionColumns: string[];
  columnTolerance: number;
  rowTolerance: number;
  datePattern: string;
  amountCleanPattern: string;
  skipHeaderLines: number;
  multiLineDescription: boolean;
}

/**
 * DBS PDF Parser - Implements table-based parsing for DBS bank statements
 * This parser identifies table headers and extracts transactions based on column positions
 */
export class DbsPdfParser {
  private config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = config;
  }

  async parse(file: File): Promise<Transaction[]> {
    console.log('Starting DBS PDF parsing...');
    if (typeof window === 'undefined') {
      throw new Error('PDF parsing is browser-only');
    }

    const pdf = await loadPdfDocument(file);
    console.log(`PDF loaded with ${pdf.numPages} pages.`);
    const allTransactions: Transaction[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items as TextItem[];

      // Find the column boundaries from the headers
      const columnBoundaries = this.findColumnBoundaries(items);
      if (!columnBoundaries) {
        console.log(`Could not find table headers on page ${i}. Skipping.`);
        continue;
      }

      // Group text items into rows based on their y-coordinate
      const rows = this.groupItemsIntoRows(items, columnBoundaries.y);

      // Process rows to extract transactions
      const pageTransactions = this.processRows(rows, columnBoundaries);
      allTransactions.push(...pageTransactions);
    }

    console.log('Finished DBS PDF parsing. Total transactions found:', allTransactions.length);
    return allTransactions;
  }

  private findColumnBoundaries(items: TextItem[]): ColumnBoundaries | null {
    console.log("Attempting to find column headers...");
    const headerPositions: { [key: string]: { x: number, width: number } } = {};
    let headerY: number | null = null;
    let foundHeaders = 0;

    for (const header of this.config.headers) {
      const foundItem = items.find(item => 
        item.str.trim().toLowerCase().startsWith(header.toLowerCase())
      );
      if (foundItem) {
        console.log(`Found header: '${header}' at x=${foundItem.transform[4]}, width=${foundItem.width}`);
        headerPositions[header] = { 
          x: foundItem.transform[4], 
          width: foundItem.width 
        };
        if (headerY === null) {
          headerY = foundItem.transform[5];
        }
        foundHeaders++;
      } else {
        console.log(`Could not find header: '${header}'`);
      }
    }

    // Only proceed if we found most of the headers
    if (foundHeaders < this.config.headers.length - 2) {
      console.log("Could not find enough headers to reliably determine table structure.");
      return null;
    }

    if (headerY === null) return null;

    console.log("Successfully found table headers:", headerPositions);
    return { positions: headerPositions, y: headerY };
  }

  private groupItemsIntoRows(items: TextItem[], headerY: number): TableRow[] {
    const rows: { [y: number]: TextItem[] } = {};
    const tolerance = this.config.rowTolerance;

    // Filter items that are below the header
    const contentItems = items.filter(item => 
      item.transform[5] < headerY && item.str.trim() !== ''
    );

    for (const item of contentItems) {
      const y = item.transform[5];
      const foundRow = Object.keys(rows).find(key => 
        Math.abs(parseFloat(key) - y) < tolerance
      );
      if (foundRow) {
        rows[parseFloat(foundRow)].push(item);
      } else {
        rows[y] = [item];
      }
    }

    return Object.entries(rows).map(([y, items]) => ({
      y: parseFloat(y),
      items: items.sort((a, b) => a.transform[4] - b.transform[4]), // Sort by x-coordinate
    })).sort((a, b) => b.y - a.y); // Sort rows from top to bottom
  }

  private processRows(rows: TableRow[], boundaries: ColumnBoundaries): Transaction[] {
    console.log(`Processing ${rows.length} rows...`);
    const transactions: Transaction[] = [];
    let currentTransaction: Transaction | null = null;

    for (const [index, row] of rows.entries()) {
      const rowText = row.items.map(i => i.str).join(' ').trim();
      console.log(`\n--- Processing Row ${index}: "${rowText}" ---`);

      const rowData = this.assignItemsToColumns(row.items, boundaries);
      console.log(`Row ${index} data:`, JSON.stringify(rowData, null, 2));

      const rawDate = rowData[this.config.dateColumn]?.trim();
      const date = rawDate ? this.extractDateString(rawDate) : null;
      const debitText = rowData[this.config.amountColumns.debit]?.trim();
      const creditText = rowData[this.config.amountColumns.credit]?.trim();
      const details = rowData['Unassigned']?.trim();
      const amount = this.parseAmount(debitText, creditText);

      console.log(`Row ${index} parsed values: date=${date}, amount=${amount}, details="${details}"`);

      if (date && amount !== 0) {
        console.log(`Row ${index}: Found a new transaction with amount ${amount}.`);
        // This is a new transaction. Push the previous one if it exists.
        if (currentTransaction) {
          console.log(`Row ${index}: Pushing previous transaction:`, JSON.stringify(currentTransaction, null, 2));
          transactions.push(currentTransaction);
        }
        
        currentTransaction = {
          id: `tr-${Date.now()}-${Math.random()}`,
          user_id: '', // Will be filled when saving
          transaction_date: date,
          description: details || '',
          amount: amount,
          transaction_type: amount > 0 ? 'income' : 'expense',
          is_transfer: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Legacy fields for backward compatibility
          date: date,
          type: amount > 0 ? 'income' : 'expense',
          category: 'Uncategorized',
        };
        console.log(`Row ${index}: Created new currentTransaction:`, JSON.stringify(currentTransaction, null, 2));

      } else if (!date && !amount && details && currentTransaction && this.config.multiLineDescription) {
        console.log(`Row ${index}: Found description continuation. Appending "${details}" to current transaction.`);
        // This is a continuation of the description for the current transaction.
        currentTransaction.description += ` ${details}`;
        console.log(`Row ${index}: Updated currentTransaction description:`, JSON.stringify(currentTransaction, null, 2));
      } else {
        console.log(`Row ${index}: Not a new transaction or a description continuation. Skipping.`);
      }
    }

    // Push the last transaction if it exists.
    if (currentTransaction) {
      console.log('Pushing the very last transaction:', JSON.stringify(currentTransaction, null, 2));
      transactions.push(currentTransaction);
    }

    console.log('Final transactions:', JSON.stringify(transactions, null, 2));
    return transactions;
  }

  private assignItemsToColumns(items: TextItem[], boundaries: ColumnBoundaries): { [key: string]: string } {
    const rowData: { [key: string]: string } = { 'Unassigned': '' };

    for (const item of items) {
      const x = item.transform[4];
      let assignedColumn: string | null = null;

      // Find which column the item belongs to based on its x-position
      for (const [header, { x: headerX, width }] of Object.entries(boundaries.positions)) {
        // Check if the item's start or end is within the column boundaries
        if (x >= headerX - this.config.columnTolerance && x < headerX + width + this.config.columnTolerance) { 
          assignedColumn = header;
          break;
        }
      }

      if (assignedColumn) {
        rowData[assignedColumn] = (rowData[assignedColumn] || '') + item.str + ' ';
      } else {
        // If it doesn't fit in any other column, assume it's part of the description.
        rowData['Unassigned'] += item.str + ' ';
      }
    }

    // If the main details column got something, append it to unassigned and remove it
    if (rowData['Details of transaction']) {
      rowData['Unassigned'] = (rowData['Details of transaction'] + rowData['Unassigned']).trim();
      delete rowData['Details of transaction'];
    }

    return rowData;
  }

  private extractDateString(text: string): string | null {
    const datePattern = new RegExp(this.config.datePattern);
    const match = text.trim().match(datePattern);
    if (match) {
      return match[0];
    }
    return null;
  }

  private parseAmount(debit?: string, credit?: string): number {
    const cleanText = (text: string) => text.replace(new RegExp(this.config.amountCleanPattern, 'g'), '');

    if (credit && parseFloat(cleanText(credit)) > 0) {
      return parseFloat(cleanText(credit));
    }
    if (debit && parseFloat(cleanText(debit)) > 0) {
      return -parseFloat(cleanText(debit));
    }
    return 0;
  }
}

// Export the parser factory function
export const createDbsPdfParser = (config: ParserConfig): DbsPdfParser => {
  return new DbsPdfParser(config);
};
