# Bank Statement Parser Templates

This directory contains bank-specific parser modules for processing different bank statement formats.

## Current Templates

### DBS Bank
- **File**: `dbs_pdf_v1.ts`
- **Format**: PDF
- **Status**: Active
- **Features**: Table-based parsing with multi-line description support

### ICICI Bank
- **File**: `icici_pdf_v1.ts`
- **Format**: PDF
- **Status**: Active
- **Features**: 
  - Table-based parsing with CR/DR type indicators
  - Date format: DD-MM-YYYY
  - Amount and Type column parsing
  - Multi-line description support

## Adding New Templates

1. Create a new TypeScript file following the naming convention: `[bank]_[format]_v[version].ts`
2. Implement the parser class with the required interface
3. Export a factory function for creating parser instances
4. Add the template configuration to the database
5. Test with sample bank statements

## Template Structure

Each template should export:
- A parser class that implements the parsing logic
- A factory function that creates parser instances
- TypeScript interfaces for configuration

## Documentation

See `../docs/BANK_TEMPLATE_SYSTEM.md` for detailed documentation on:
- Creating new templates
- Configuration options
- Testing procedures
- Best practices

## Example Usage

```typescript
import { createDbsPdfParser } from './dbs_pdf_v1';

const parser = createDbsPdfParser(config);
const transactions = await parser.parse(file);
```
