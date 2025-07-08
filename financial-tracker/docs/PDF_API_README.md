# PDF Bank Statement Processing API

This API route processes PDF bank statements using Google Gemini AI to extract transaction data.

## Endpoint

`POST /api/statements/pdf`

## Features

- ✅ Accepts PDF files up to 20MB via multipart/form-data
- ✅ Uses Google Gemini Flash 2.0 for transaction extraction
- ✅ Returns structured JSON with transactions and analytics
- ✅ Duplicate transaction removal
- ✅ Token usage tracking
- ✅ Type-safe implementation with TypeScript
- ✅ Extensible LLM provider interface

## Setup

### 1. Environment Variables

Create a `.env.local` file with:

```env
GEMINI_API_KEY=your_gemini_api_key_here
MAX_UPLOAD_MB=20
```

### 2. Dependencies

The following packages are required and have been added to package.json:

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "formidable": "^3.5.1",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "@types/formidable": "^3.4.5",
    "@types/pdf-parse": "^1.1.4"
  }
}
```

## API Usage

### Request

- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**: File field named "file" containing a PDF

### Response

```json
{
  "transactions": [
    {
      "date": "2025-01-15",
      "description": "Payment to Amazon",
      "category": "shopping",
      "amount": -89.99,
      "currency": "USD"
    }
  ],
  "analytics": {
    "pagesProcessed": 3,
    "inputTokens": 1250,
    "outputTokens": 450
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Client Usage

```typescript
import { uploadPdfStatement } from '../lib/api/pdfStatementClient';

const handleFileUpload = async (file: File) => {
  try {
    const result = await uploadPdfStatement(file);
    console.log('Transactions:', result.transactions);
    console.log('Analytics:', result.analytics);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Architecture

### LLM Provider Interface

The implementation uses an extensible provider pattern:

```typescript
interface LLMProvider {
  extractTransactions(pageText: string): Promise<ExtractionResult>;
}
```

This allows easy swapping of AI models in the future.

### Files Structure

```
src/
├── lib/
│   ├── llm/
│   │   ├── types.ts           # Type definitions
│   │   └── GeminiService.ts   # Gemini AI implementation
│   └── api/
│       └── pdfStatementClient.ts  # Client helper
└── pages/
    └── api/
        └── statements/
            └── pdf.ts         # Main API route
```

## Error Handling

- File size validation (20MB limit)
- PDF format validation
- Gemini API error handling
- Malformed JSON response handling
- Environment configuration validation

## Security Considerations

- File uploads are processed in memory only
- Temporary files are cleaned up immediately
- No file persistence
- Input validation on file type and size
- Ready for JWT middleware integration

## Future Enhancements

1. **Page-by-page Processing**: Currently processes entire PDF as one text block. Can be enhanced to process individual pages.
2. **Rate Limiting**: Add rate limiting for API calls
3. **Authentication**: JWT middleware integration
4. **Caching**: Cache extracted data for duplicate uploads
5. **OCR Support**: Add OCR for scanned PDFs
6. **Multiple AI Providers**: Extend interface for Claude, GPT-4, etc.

## Testing

Test the API with a sample PDF:

```bash
curl -X POST \
  -F "file=@sample-statement.pdf" \
  http://localhost:3000/api/statements/pdf
```
