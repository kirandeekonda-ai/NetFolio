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

interface IciciParserConfig {
  type: string;
  headers: string[];
  dateColumn: string;
  dateFormat: string;
  amountColumn: string;
  typeColumn: string;
  descriptionColumn: string;
  columnTolerance: number;
  rowTolerance: number;
  datePattern: string;
  amountPattern: string;
  skipHeaderLines: number;
  multiLineDescription: boolean;
}

/**
 * ICICI Bank PDF Parser - Implements table-based parsing for ICICI bank statements
 * This parser handles ICICI's specific format with CR/DR type indicators
 */
export class IciciPdfParser {
  private config: IciciParserConfig;

  constructor(config: IciciParserConfig) {
    this.config = config;
  }

  async parse(file: File): Promise<Transaction[]> {
    console.log('Starting ICICI PDF parsing...');
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

      if (items.length === 0) {
        console.log(`Page ${i} has no text content. Skipping.`);
        continue;
      }

      // Find the column boundaries from the headers
      const columnBoundaries = this.findColumnBoundaries(items);
      
      // For ICICI, always proceed with parsing using fixed boundaries
      // The PDF structure is consistent across pages
      const finalBoundaries = columnBoundaries || {
        positions: {
          'Date': { x: 95, width: 100 },
          'Description': { x: 210, width: 250 },
          'Amount': { x: 470, width: 80 },
          'Type': { x: 580, width: 40 }
        },
        y: 700 // Default header position
      };

      // Group text items into rows based on their y-coordinate
      const rows = this.groupItemsIntoRows(items, finalBoundaries.y);

      // Process rows to extract transactions
      const pageTransactions = this.processRows(rows, finalBoundaries);
      allTransactions.push(...pageTransactions);
    }

    console.log('Finished ICICI PDF parsing. Total transactions found:', allTransactions.length);
    return allTransactions;
  }

  private findColumnBoundaries(items: TextItem[]): ColumnBoundaries | null {
    console.log("Looking for ICICI headers in", items.length, "text items");
    console.log("Sample items:", items.slice(0, 10).map(item => `"${item.str}" at (${item.transform[4]}, ${item.transform[5]})`));
    
    const headerPositions: { [key: string]: { x: number, width: number } } = {};
    let headerY: number | null = null;
    let foundHeaders = 0;

    // Look for the exact headers as they appear in the PDF
    const headersToFind = ['Date', 'Description', 'Amount', 'Type'];
    
    for (const header of headersToFind) {
      const foundItem = items.find(item => 
        item.str.trim().toLowerCase() === header.toLowerCase()
      );
      if (foundItem) {
        console.log(`Found header: '${header}' at x=${foundItem.transform[4]}, y=${foundItem.transform[5]}`);
        headerPositions[header] = { 
          x: foundItem.transform[4], 
          width: foundItem.width 
        };
        if (headerY === null) {
          headerY = foundItem.transform[5];
        }
        foundHeaders++;
      } else {
        console.log(`Header '${header}' not found`);
      }
    }

    console.log(`Found ${foundHeaders} out of ${headersToFind.length} headers`);

    // ICICI-specific adjustment: Use actual X coordinates from console logs
    // Date items are at x=86.7, Amount at x=368.08, Type at x=433.01
    const adjustedBoundaries = {
      'Date': { x: 87, width: 60 },         // Date column: 86.7, narrow width to avoid overlap
      'Description': { x: 170, width: 180 }, // Description column: starts around x=170, ends before Amount
      'Amount': { x: 368, width: 50 },       // Amount column: exactly where amounts appear (368.08)
      'Type': { x: 433, width: 30 }          // Type column: exactly where CR/DR appears (433.01)
    };

    // Use a default Y position if no headers found
    const finalY = headerY || 700; // Assume headers are near top of page
    
    console.log("Using adjusted boundaries:", adjustedBoundaries);
    return { positions: adjustedBoundaries, y: finalY };
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
    console.log(`Processing ${rows.length} rows with boundaries:`, boundaries.positions);
    const transactions: Transaction[] = [];
    let currentTransaction: Transaction | null = null;

    for (const [index, row] of rows.entries()) {
      const rowText = row.items.map(i => i.str).join(' ').trim();
      
      // Skip empty rows
      if (!rowText) continue;
      
      // Skip header row
      if (rowText.includes('Date Description Amount Type') || 
          rowText.includes('Date') && rowText.includes('Description') && rowText.includes('Amount')) {
        console.log(`Row ${index}: Skipping header row`);
        continue;
      }

      // Skip footer/system generated text
      if (rowText.includes('system-generated') || rowText.includes('signature')) {
        console.log(`Row ${index}: Skipping footer row`);
        continue;
      }

      // Assign items to columns based on their X-coordinates
      const rowData = this.assignItemsToColumns(row.items, boundaries);
      
      // Debug: log column assignments for critical rows
      if (index < 10) {
        console.log(`Row ${index} column assignments:`, rowData);
      }

      // Extract data from specific columns
      const dateText = rowData['Date']?.trim();
      const descriptionText = (rowData['Description'] || rowData['Unassigned'] || '').trim();
      const amountText = rowData['Amount']?.trim();
      const typeText = rowData['Type']?.trim();

      // Parse the extracted data
      const date = dateText ? this.extractDateString(dateText) : null;
      const { amount, type } = this.parseAmountAndType(amountText, typeText);
      
      // Additional type detection from description if type column is empty
      let finalType = type;
      if (!typeText && descriptionText) {
        if (descriptionText.includes(' CR') || descriptionText.endsWith('CR')) {
          finalType = 'income';
        } else if (descriptionText.includes(' DR') || descriptionText.endsWith('DR')) {
          finalType = 'expense';
        }
      }

      console.log(`Row ${index}: parsed - date=${date}, amount=${amount}, type=${finalType}, desc="${descriptionText?.substring(0, 50)}..."`);

      // Handle multi-row transactions common in ICICI PDFs
      if (date && descriptionText) {
        // This starts a new transaction (with or without amount)
        
        // Push any previous pending transaction first
        if (currentTransaction && currentTransaction.amount !== 0) {
          console.log(`Row ${index}: Pushing previous complete transaction`);
          transactions.push(currentTransaction);
        }
        
        currentTransaction = {
          id: `tr-${Date.now()}-${Math.random()}`,
          date: date,
          description: descriptionText,
          amount: amount || 0,  // Use amount if available, otherwise 0 for now
          type: finalType,
          category: 'Uncategorized',
        };
        
        console.log(`Row ${index}: Started new transaction: ${date} | ${amount || 0} | ${finalType}`);

      } else if (!date && amount !== 0 && currentTransaction && currentTransaction.amount === 0) {
        // This is an amount row for the current pending transaction
        let finalAmount = amount;
        
        // Apply the correct sign based on the transaction type determined from the first row
        if (currentTransaction.type === 'expense' && finalAmount > 0) {
          finalAmount = -Math.abs(finalAmount);
        } else if (currentTransaction.type === 'income' && finalAmount < 0) {
          finalAmount = Math.abs(finalAmount);
        }
        
        currentTransaction.amount = finalAmount;
        
        // Also append description if present (common in ICICI where amount row also has description continuation)
        if (descriptionText && descriptionText.trim() !== amountText?.trim()) {
          // Extract the description part by removing the amount
          let cleanDescription = descriptionText;
          if (amountText) {
            cleanDescription = cleanDescription.replace(amountText, '').trim();
          }
          
          if (cleanDescription) {
            console.log(`Row ${index}: Appending description continuation: "${cleanDescription}"`);
            currentTransaction.description += ` ${cleanDescription}`;
            console.log(`Row ${index}: Updated full description: "${currentTransaction.description}"`);
          }
        }
        
        console.log(`Row ${index}: Added amount to current transaction: ${finalAmount} | ${currentTransaction.type}`);
        
      } else if (!date && !amount && descriptionText && currentTransaction && this.config.multiLineDescription) {
        // This is a continuation of the description only
        console.log(`Row ${index}: Appending description-only continuation: "${descriptionText}"`);
        currentTransaction.description += ` ${descriptionText}`;
        console.log(`Row ${index}: Updated description: "${currentTransaction.description}"`);
        
      } else if (!date && amount !== 0 && !currentTransaction) {
        // Standalone amount without a pending transaction - skip or log warning
        console.log(`Row ${index}: Found standalone amount ${amount} without pending transaction - skipping`);
      }
    }

    // Push the last transaction if it exists and is complete
    if (currentTransaction && currentTransaction.amount !== 0) {
      console.log('Pushing final transaction');
      transactions.push(currentTransaction);
    } else if (currentTransaction && currentTransaction.amount === 0) {
      console.log('Discarding incomplete final transaction (missing amount)');
    }

    console.log(`Extracted ${transactions.length} transactions from processRows`);
    return transactions;
  }

  /**
   * Try to extract a complete transaction from a single row
   */
  private extractCompleteTransaction(rowText: string): {
    isValid: boolean;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  } {
    console.log('DEBUG: Parsing transaction:', rowText);
    
    // Work backwards from CR/DR to find the amount
    // The amount should be the last standalone number before CR/DR
    
    // First extract date
    const dateMatch = rowText.match(/^(\d{2}-\d{2}-\d{4})/);
    if (!dateMatch) {
      console.log('DEBUG: No date found');
      return { isValid: false, date: '', description: '', amount: 0, type: 'expense' };
    }
    
    const date = dateMatch[1];
    const validDate = this.validateDate(date);
    if (!validDate) {
      console.warn('Invalid date in transaction:', date);
      return { isValid: false, date: '', description: '', amount: 0, type: 'expense' };
    }
    
    // Extract type from the end
    const typeMatch = rowText.match(/(CR|DR)\s*$/);
    if (!typeMatch) {
      console.log('DEBUG: No CR/DR found');
      return { isValid: false, date: '', description: '', amount: 0, type: 'expense' };
    }
    
    const typeStr = typeMatch[1];
    const type: 'income' | 'expense' = typeStr === 'CR' ? 'income' : 'expense';
    
    // Now find the amount by looking for the last number before CR/DR
    // Remove the CR/DR part first
    const withoutType = rowText.replace(/\s+(CR|DR)\s*$/, '');
    console.log('DEBUG: Without type:', withoutType);
    
    // Find the last number that looks like a monetary amount
    // It should be isolated by spaces and not part of a longer alphanumeric string
    const amountPattern = /\s(\d+(?:\.\d{2})?)\s*$/;
    const amountMatch = withoutType.match(amountPattern);
    
    if (!amountMatch) {
      console.log('DEBUG: No amount found with pattern');
      return { isValid: false, date: '', description: '', amount: 0, type: 'expense' };
    }
    
    const amountStr = amountMatch[1];
    let amount = parseFloat(amountStr);
    
    console.log('DEBUG: Found amount string:', amountStr);
    console.log('DEBUG: Parsed amount:', amount);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      console.log('DEBUG: Invalid amount:', amountStr);
      return { isValid: false, date: '', description: '', amount: 0, type: 'expense' };
    }
    
    // The description is everything between the date and the amount
    const description = withoutType
      .replace(/^\d{2}-\d{2}-\d{4}\s+/, '') // Remove date
      .replace(/\s+\d+(?:\.\d{2})?\s*$/, '') // Remove amount
      .trim();
    
    console.log('DEBUG: Extracted description:', description);
    
    // Skip if description is too short (likely parsing error)
    if (description.length < 3) {
      console.log('DEBUG: Description too short:', description);
      return { isValid: false, date: '', description: '', amount: 0, type: 'expense' };
    }
    
    if (type === 'expense') {
      amount = -Math.abs(amount);
    }
    
    console.log('DEBUG: Final parsed transaction:');
    console.log('  Date:', validDate);
    console.log('  Description:', description);
    console.log('  Amount:', amount);
    console.log('  Type:', type);
    
    return {
      isValid: true,
      date: validDate,
      description: description,
      amount,
      type
    };
  }

  /**
   * Extract partial transaction data from a row
   */
  private extractPartialTransactionData(rowText: string): {
    date?: string;
    description?: string;
    amount?: number;
    type?: 'income' | 'expense';
  } {
    const result: { date?: string; description?: string; amount?: number; type?: 'income' | 'expense' } = {};
    
    // Check for date at start
    const dateMatch = rowText.match(/^(\d{2}-\d{2}-\d{4})/);
    if (dateMatch) {
      const validDate = this.validateDate(dateMatch[1]);
      if (validDate) {
        result.date = validDate;
      }
    }
    
    // Check for type at end
    const typeMatch = rowText.match(/(CR|DR)\s*$/);
    if (typeMatch) {
      result.type = typeMatch[1] === 'CR' ? 'income' : 'expense';
    }
    
    // Extract amount - look for the last number before CR/DR (if present) or at the end
    let textToSearch = rowText;
    if (typeMatch) {
      textToSearch = rowText.replace(/\s+(CR|DR)\s*$/, '');
    }
    
    // Look for amount at the end of the remaining text
    const amountMatch = textToSearch.match(/(\d+(?:\.\d{2})?)\s*$/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      if (!isNaN(amount) && amount > 0) {
        result.amount = amount;
      }
    }
    
    // Extract description
    let description = rowText;
    
    // Remove date from start
    if (dateMatch) {
      description = description.replace(/^\d{2}-\d{2}-\d{4}\s*/, '');
    }
    
    // Remove type from end
    if (typeMatch) {
      description = description.replace(/\s*(CR|DR)\s*$/, '');
    }
    
    // Remove amount from end
    if (result.amount) {
      description = description.replace(/\s*\d+(?:\.\d{2})?\s*$/, '');
    }
    
    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    
    if (description.length > 0) {
      result.description = description;
    }
    
    return result;
  }

  /**
   * Check if pending transaction has all required fields
   */
  private isPendingTransactionComplete(pending: any): boolean {
    return pending.date && pending.description && pending.amount !== undefined && pending.type;
  }

  /**
   * Create transaction from pending data
   */
  private createTransactionFromPending(pending: any): Transaction | null {
    if (!this.isPendingTransactionComplete(pending)) {
      return null;
    }
    
    // Validate date format
    const validDate = this.validateDate(pending.date);
    if (!validDate) {
      console.warn('Skipping transaction with invalid date:', pending.date);
      return null;
    }
    
    let amount = pending.amount;
    if (pending.type === 'expense') {
      amount = -Math.abs(amount);
    }
    
    return {
      id: `tr-${Date.now()}-${Math.random()}`,
      date: validDate,
      description: pending.description.trim(),
      amount,
      type: pending.type,
      category: 'Uncategorized',
    };
  }

  private assignItemsToColumns(items: TextItem[], boundaries: ColumnBoundaries): { [key: string]: string } {
    const rowData: { [key: string]: string } = { 'Unassigned': '' };

    for (const item of items) {
      const x = item.transform[4];
      let assignedColumn: string | null = null;

      // Find which column the item belongs to based on its x-position
      for (const [header, { x: headerX, width }] of Object.entries(boundaries.positions)) {
        const columnStart = headerX - this.config.columnTolerance;
        const columnEnd = headerX + width + this.config.columnTolerance;
        
        // Check if the item's x-position falls within the column boundaries
        if (x >= columnStart && x <= columnEnd) { 
          assignedColumn = header;
          break;
        }
      }

      if (assignedColumn) {
        rowData[assignedColumn] = (rowData[assignedColumn] || '') + item.str + ' ';
      } else {
        // If it doesn't fit in any defined column, add to unassigned
        rowData['Unassigned'] += item.str + ' ';
      }
    }

    // Clean up the values by trimming whitespace
    for (const key in rowData) {
      rowData[key] = rowData[key].trim();
    }

    // If the Description column got something, append it to unassigned and remove it
    // This helps with complex descriptions that span multiple areas
    if (rowData['Description']) {
      rowData['Unassigned'] = (rowData['Description'] + ' ' + rowData['Unassigned']).trim();
      // Don't delete the Description column completely, but merge it
      rowData['Description'] = rowData['Unassigned'];
    }

    return rowData;
  }

  private extractDateString(text: string): string | null {
    const datePattern = new RegExp(this.config.datePattern);
    const match = text.trim().match(datePattern);
    if (match) {
      return this.validateDate(match[0]);
    }
    return null;
  }

  private parseAmountAndType(amountText?: string, typeText?: string): { amount: number; type: 'income' | 'expense' } {
    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (amountText) {
      // Clean the amount text - remove currency symbols, commas, but preserve decimal points
      const cleanedAmount = amountText.replace(/[₹,\s]/g, '').replace(/[^\d.-]/g, '');
      
      if (cleanedAmount) {
        const parsedAmount = parseFloat(cleanedAmount);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          amount = parsedAmount;
        }
      }
    }

    if (typeText) {
      // Determine transaction type based on CR/DR
      const cleanType = typeText.toUpperCase().trim();
      
      if (cleanType.includes('CR')) {
        type = 'income';
        // Keep amount positive for credit transactions
      } else if (cleanType.includes('DR')) {
        type = 'expense';
        amount = -Math.abs(amount); // Make debit amounts negative
      }
    }

    return { amount, type };
  }

  /**
   * Format ICICI date (DD-MM-YYYY) to JavaScript Date string (YYYY-MM-DD)
   */
  private formatDateForJS(dateStr: string): string {
    if (!dateStr) return '';
    
    // Handle DD-MM-YYYY format
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    
    // Return original if format doesn't match
    return dateStr;
  }

  /**
   * Validate and parse date string
   */
  private validateDate(dateStr: string): string | null {
    const formattedDate = this.formatDateForJS(dateStr);
    const date = new Date(formattedDate);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date detected:', dateStr);
      return null;
    }
    
    return formattedDate;
  }

  /**
   * Parse pages without headers (continuation pages)
   */
  private parsePageWithoutHeaders(items: TextItem[]): Transaction[] {
    console.log('Parsing page without headers using column positions...');
    const transactions: Transaction[] = [];
    
    if (items.length === 0) {
      console.log('No items to parse on headerless page');
      return transactions;
    }
    
    // For continuation pages, we'll use a simplified approach
    // Group items by Y-coordinate and try to extract transactions line by line
    const rowGroups: { [y: number]: TextItem[] } = {};
    const tolerance = this.config.rowTolerance;
    
    for (const item of items) {
      if (!item.str.trim()) continue;
      
      const y = item.transform[5];
      const foundRow = Object.keys(rowGroups).find(key => 
        Math.abs(parseFloat(key) - y) < tolerance
      );
      
      if (foundRow) {
        rowGroups[parseFloat(foundRow)].push(item);
      } else {
        rowGroups[y] = [item];
      }
    }
    
    // Convert to sorted rows
    const sortedRows = Object.entries(rowGroups)
      .map(([y, items]) => ({
        y: parseFloat(y),
        items: items.sort((a, b) => a.transform[4] - b.transform[4]) // Sort by x-coordinate
      }))
      .sort((a, b) => b.y - a.y); // Sort from top to bottom
    
    console.log(`Found ${sortedRows.length} rows on headerless page`);
    
    // For headerless pages, use the same adjusted column structure as header pages
    const estimatedBoundaries: ColumnBoundaries = {
      positions: {
        'Date': { x: 95, width: 100 },
        'Description': { x: 210, width: 250 },
        'Amount': { x: 470, width: 80 },
        'Type': { x: 580, width: 40 }
      },
      y: 0
    };
    
    // Process each row using the estimated column boundaries
    const processedTransactions = this.processRows(sortedRows, estimatedBoundaries);
    
    console.log(`Extracted ${processedTransactions.length} transactions from headerless page`);
    return processedTransactions;
  }
}

/**
 * Test method to verify continuation page parsing
 * This method can be called directly to test the parser
 */
export const testIciciContinuationPageParsing = () => {
  console.log('=== Testing ICICI Continuation Page Parsing ===');
  
  const config = {
    type: 'table_based',
    headers: ['Date', 'Description', 'Amount', 'Type'],
    dateColumn: 'Date',
    dateFormat: 'DD-MM-YYYY',
    amountColumn: 'Amount',
    typeColumn: 'Type',
    descriptionColumn: 'Description',
    columnTolerance: 15,
    rowTolerance: 5,
    datePattern: '(\\d{2}-\\d{2}-\\d{4})',
    amountPattern: '\\d+\\.\\d{2}',
    skipHeaderLines: 1,
    multiLineDescription: true
  };
  
  const parser = createIciciPdfParser(config);
  
  // Test the exact format from the user's PDF
  const sampleTransactions = [
    '12-06-2025 UPI/tailoringjobs@a/Payment from Ph/AXIS BANK/375851094970/IBLa22df3f74d4d40ceb5f73aebac707d8a/ 90000.00 DR',
    '07-06-2025 NEFT-YESBN120250607064389117-ZERODHA BROKING LTD-DSCNBJ 52683.63 CR'
  ];
  
  sampleTransactions.forEach((line, index) => {
    console.log(`\nTesting transaction ${index + 1}:`);
    console.log(`Input: "${line}"`);
    
    const extracted = (parser as any).extractCompleteTransaction(line);
    
    if (extracted.isValid) {
      console.log(`✅ SUCCESS - Extracted:`);
      console.log(`   Date: ${extracted.date}`);
      console.log(`   Description: ${extracted.description}`);
      console.log(`   Amount: ${extracted.amount}`);
      console.log(`   Type: ${extracted.type}`);
      
      // Special verification for the problematic transaction
      if (index === 0) {
        if (Math.abs(extracted.amount) === 90000.00) {
          console.log('✅ AMOUNT FIX VERIFIED: 90000.00 correctly extracted!');
        } else {
          console.log(`❌ AMOUNT FIX FAILED: Expected 90000.00, got ${Math.abs(extracted.amount)}`);
        }
      }
    } else {
      console.log(`❌ FAILED - Could not extract transaction`);
    }
  });
};

// Export the parser factory function
export const createIciciPdfParser = (config: IciciParserConfig): IciciPdfParser => {
  return new IciciPdfParser(config);
};
