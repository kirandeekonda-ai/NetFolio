# Bank Template System Documentation

## Overview

The bank template system provides a scalable, hybrid solution for parsing multiple bank statement formats (PDF, CSV) in the NetFolio financial tracking application. The system combines database-stored configuration with code-based parsing logic to support various bank statement formats.

## Architecture

### Components

1. **Database Layer**: `bank_templates` table stores parsing configurations
2. **Parser Modules**: TypeScript files containing bank-specific parsing logic
3. **Hybrid Service**: `BankStatementParserService` dynamically loads and executes parsers
4. **Template Manager**: Utilities for managing templates

### Database Schema

```sql
CREATE TABLE bank_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('PDF', 'CSV')),
    identifier TEXT NOT NULL UNIQUE,
    parser_module TEXT NOT NULL,
    parser_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Directory Structure

```
src/
├── templates/
│   ├── dbs_pdf_v1.ts           # DBS PDF parser
│   ├── example_bank_csv_v1.ts  # Example CSV parser
│   └── [bank]_[format]_v[n].ts # Additional parsers
├── utils/
│   ├── bankStatementParser.ts  # Main hybrid service
│   └── templateManager.ts      # Template management utilities
└── components/
    └── ...
```

## Adding New Bank Templates

### Step 1: Create Parser Module

Create a new TypeScript file in `src/templates/` following the naming convention:
`[bank_name]_[format]_v[version].ts`

Example: `chase_pdf_v1.ts`

#### For PDF Parsers

```typescript
import { Transaction } from '@/types';
import { loadPdfDocument } from '@/utils/pdfLoader';

// Type definitions
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

export class ChasePdfParser {
  private config: ParserConfig;

  constructor(config: ParserConfig) {
    this.config = config;
  }

  async parse(file: File): Promise<Transaction[]> {
    // Implement bank-specific parsing logic
    // Use this.config for configuration values
    
    const pdf = await loadPdfDocument(file);
    const transactions: Transaction[] = [];
    
    // Your parsing logic here
    
    return transactions;
  }
}

// Export factory function
export const createChasePdfParser = (config: ParserConfig): ChasePdfParser => {
  return new ChasePdfParser(config);
};
```

#### For CSV Parsers

```typescript
import { Transaction } from '@/types';
import Papa from 'papaparse';

interface CsvParserConfig {
  type: string;
  columns: {
    date: number;
    description: number;
    amount: number;
    type?: number;
  };
  dateFormat: string;
  hasHeader: boolean;
  skipLines: number;
  delimiter: string;
  textQualifier: string;
}

export class ChaseCsvParser {
  private config: CsvParserConfig;

  constructor(config: CsvParserConfig) {
    this.config = config;
  }

  async parse(file: File): Promise<Transaction[]> {
    return new Promise((resolve) => {
      Papa.parse<string[]>(file, {
        complete: (results) => {
          const transactions: Transaction[] = [];
          
          // Skip header and any additional lines
          const startIndex = this.config.skipLines + (this.config.hasHeader ? 1 : 0);
          
          for (let i = startIndex; i < results.data.length; i++) {
            const row = results.data[i];
            
            // Parse according to your bank's CSV format
            const transaction: Transaction = {
              id: `tr-${Date.now()}-${i}`,
              date: row[this.config.columns.date],
              description: row[this.config.columns.description],
              amount: parseFloat(row[this.config.columns.amount]),
              type: parseFloat(row[this.config.columns.amount]) > 0 ? 'income' : 'expense',
              category: 'Uncategorized'
            };
            
            transactions.push(transaction);
          }
          
          resolve(transactions);
        },
        delimiter: this.config.delimiter,
        header: false,
      });
    });
  }
}

export const createChaseCsvParser = (config: CsvParserConfig): ChaseCsvParser => {
  return new ChaseCsvParser(config);
};
```

### Step 2: Add Template to Database

Use the template manager to add the new template:

```typescript
import { templateUtils } from '@/utils/templateManager';

// Example for PDF template
const pdfTemplate = {
  bankName: 'Chase Bank',
  format: 'PDF' as const,
  identifier: 'chase_pdf_v1',
  parserModule: 'chase_pdf_v1.ts',
  parserConfig: {
    type: 'table_based',
    headers: [
      'Date',
      'Description',
      'Amount',
      'Balance'
    ],
    dateColumn: 'Date',
    dateFormat: 'MM/DD/YYYY',
    amountColumns: {
      debit: 'Amount',
      credit: 'Amount'
    },
    descriptionColumns: ['Description'],
    columnTolerance: 10,
    rowTolerance: 5,
    datePattern: '(\\d{2}/\\d{2}/\\d{4})',
    amountCleanPattern: '[^\\d.-]',
    skipHeaderLines: 1,
    multiLineDescription: false
  }
};

// Add to database
const result = await templateUtils.create(pdfTemplate);
```

### Step 3: Test the Template

```typescript
// Test with a sample file
const testFile = new File(['sample content'], 'test.pdf', { type: 'application/pdf' });
const testResult = await templateUtils.test('chase_pdf_v1', testFile);

console.log('Test result:', testResult);
```

### Step 4: Update Parser Service (if needed)

If you're adding a new parser type or format, update the `BankStatementParserService`:

```typescript
// In bankStatementParser.ts
private async executeParser(file: File, template: BankTemplate): Promise<Transaction[]> {
  const modulePath = `@/templates/${template.parser_module.replace('.ts', '')}`;
  const parserModule = await import(modulePath);

  if (template.format === 'PDF') {
    // Handle PDF parsers
    if (template.identifier.includes('chase')) {
      return await parserModule.createChasePdfParser(template.parser_config).parse(file);
    }
    // ... other PDF parsers
  } else if (template.format === 'CSV') {
    // Handle CSV parsers
    if (template.identifier.includes('chase')) {
      return await parserModule.createChaseCsvParser(template.parser_config).parse(file);
    }
    // ... other CSV parsers
  }
}
```

## Configuration Reference

### PDF Parser Configuration

```json
{
  "type": "table_based",
  "headers": ["Date", "Description", "Amount", "Balance"],
  "dateColumn": "Date",
  "dateFormat": "MM/DD/YYYY",
  "amountColumns": {
    "debit": "Amount",
    "credit": "Amount"
  },
  "descriptionColumns": ["Description"],
  "columnTolerance": 10,
  "rowTolerance": 5,
  "datePattern": "(\\d{2}/\\d{2}/\\d{4})",
  "amountCleanPattern": "[^\\d.-]",
  "skipHeaderLines": 1,
  "multiLineDescription": false
}
```

### CSV Parser Configuration

```json
{
  "type": "column_based",
  "columns": {
    "date": 0,
    "description": 1,
    "amount": 2,
    "type": 3
  },
  "dateFormat": "MM/DD/YYYY",
  "hasHeader": true,
  "skipLines": 0,
  "delimiter": ",",
  "textQualifier": "\""
}
```

## Template Management

### Listing Templates

```typescript
const templates = await templateUtils.list();
console.log(templates);
```

### Exporting Templates

```typescript
const template = await templateUtils.export('chase_pdf_v1');
console.log(template);
```

### Importing Templates

```typescript
const success = await templateUtils.import(templateConfig);
```

### Validating Templates

```typescript
const validation = templateUtils.validate(templateConfig);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

## Best Practices

1. **Naming Convention**: Use `[bank]_[format]_v[version]` for consistency
2. **Version Control**: Increment version numbers when making significant changes
3. **Error Handling**: Always include comprehensive error handling in parsers
4. **Testing**: Test with multiple statement samples before deployment
5. **Documentation**: Document any bank-specific parsing logic
6. **Configuration**: Keep parsing logic configurable through the parser_config
7. **Performance**: Consider memory usage for large PDF files

## Troubleshooting

### Common Issues

1. **Parser Module Not Found**: Ensure the parser file is in the correct location
2. **Invalid Configuration**: Use the validation utility to check configurations
3. **Date Parsing Errors**: Verify date patterns match the bank's format
4. **Amount Parsing Issues**: Check currency symbols and decimal separators
5. **Header Detection**: Ensure column headers match exactly

### Debugging

Enable debug logging in the parser:

```typescript
console.log('Processing row:', rowData);
console.log('Parsed values:', { date, amount, description });
```

## Migration Guide

### From Legacy Parser

If migrating from the old hardcoded parser:

1. Extract parsing logic into a new parser module
2. Create configuration JSON for the database
3. Add template to database
4. Update file upload logic to use template selector
5. Test with existing statements

### Database Migration

Run the migration script to create the bank_templates table:

```sql
-- Run this in your Supabase SQL editor
-- File: 20250707000000_create_bank_templates_table.sql
```

## Support

For issues or questions about the template system:

1. Check the validation errors first
2. Review the parser module exports
3. Verify the database configuration
4. Test with sample files
5. Check the browser console for detailed error messages

## Examples

The system includes example templates for:
- DBS Bank PDF statements
- Generic CSV format

Use these as reference when creating new templates.
