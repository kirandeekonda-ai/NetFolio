# Prompt Template System

## Overview

This system centralizes all LLM prompts in one place to avoid duplication and make it easy to maintain and update prompts for all models and custom endpoints.

## Architecture

### Core Components

1. **PromptTemplateService** - Manages all prompt templates with variable substitution
2. **TransactionExtractionPromptBuilder** - Helper class for building transaction-specific prompts
3. **Prompt Templates** - Centralized template definitions with variable placeholders

### Key Features

- **Centralized Management**: All prompts defined in one place
- **Variable Substitution**: Dynamic content insertion using `{{variable}}` syntax
- **Type Safety**: Required variables validation
- **Template Validation**: Ensures all required variables are provided
- **Extensible**: Easy to add new prompt templates

## Usage

### Basic Usage

```typescript
import { transactionPromptBuilder } from '@/lib/llm/PromptTemplateService';

// Build transaction extraction prompt
const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
  sanitizedPageText,
  userCategories
);

// Build connection test prompt
const testPrompt = transactionPromptBuilder.buildConnectionTestPrompt();

// Build bank validation prompt (future feature)
const validationPrompt = transactionPromptBuilder.buildBankValidationPrompt(documentText);
```

### Advanced Usage

```typescript
import { promptTemplateService } from '@/lib/llm/PromptTemplateService';

// Get a specific template
const template = promptTemplateService.getTemplate('transaction_extraction');

// Build prompt with custom variables
const prompt = promptTemplateService.buildPrompt('transaction_extraction', {
  categoriesDescription: 'custom categories',
  categorizationGuidelines: 'custom guidelines',
  sanitizedPageText: 'text to analyze'
});

// Validate template variables
const validation = promptTemplateService.validateTemplate('transaction_extraction', variables);
if (!validation.isValid) {
  console.log('Missing variables:', validation.missingVariables);
}
```

## Available Templates

### 1. Transaction Extraction (`transaction_extraction`)

**Purpose**: Extracts transaction data from bank statements with enhanced accuracy

**Key Features**:
- **Improved Amount Detection**: Clear rules for positive/negative amounts based on money flow
- **Smart Categorization**: Better keyword matching with fallback to "Uncategorized"
- **Description Preservation**: Keeps original descriptions intact for user review

**Required Variables**:
- `categoriesDescription` - Description of available categories
- `categorizationGuidelines` - Guidelines for categorization
- `sanitizedPageText` - The text to analyze

**Recent Improvements**:
1. **Enhanced Amount Logic**: More explicit instructions for credit/debit detection
   - Money IN (deposits, salary, refunds) = positive amounts
   - Money OUT (expenses, payments, fees) = negative amounts
   - Clear handling of Dr/Cr indicators

2. **Smarter Categorization**: Better keyword-based category matching
   - Fuel stations → transport (e.g., "Sai Yamuna Fuel S/HYDERABAD")
   - Uses "Uncategorized" when uncertain instead of guessing
   - More specific category patterns

3. **Description Preservation**: Maintains original transaction descriptions
   - No cleaning or modification of descriptions
   - Users see complete original text for better decision-making

**Usage**:
```typescript
const prompt = transactionPromptBuilder.buildTransactionExtractionPrompt(
  sanitizedText,
  userCategories
);
```

### 2. Bank Validation (`bank_validation`)

**Purpose**: Validates bank name and statement month/period (future feature)

**Required Variables**:
- `documentText` - The document text to validate

**Usage**:
```typescript
const prompt = transactionPromptBuilder.buildBankValidationPrompt(documentText);
```

### 3. Connection Test (`connection_test`)

**Purpose**: Simple prompt to test LLM endpoint connectivity

**Required Variables**: None

**Usage**:
```typescript
const prompt = transactionPromptBuilder.buildConnectionTestPrompt();
```

## Adding New Templates

### 1. Define the Template

```typescript
// In PromptTemplateService.ts initializeTemplates method
this.registerTemplate({
  id: 'new_template',
  name: 'New Template',
  description: 'Description of what this template does',
  template: `
    Your prompt template with {{variable1}} and {{variable2}} placeholders.
    
    Instructions:
    1. Do something with {{variable1}}
    2. Process {{variable2}}
    
    Return the result.
  `,
  requiredVariables: ['variable1', 'variable2']
});
```

### 2. Add Helper Method (Optional)

```typescript
// In TransactionExtractionPromptBuilder class
public buildNewPrompt(variable1: string, variable2: string): string {
  return this.promptService.buildPrompt('new_template', {
    variable1,
    variable2
  });
}
```

### 3. Use in LLM Services

```typescript
// In any LLM service
const prompt = promptTemplateService.buildPrompt('new_template', {
  variable1: 'value1',
  variable2: 'value2'
});
```

## Benefits

### Before (Duplicated Prompts)
- Same prompt logic copied across 4+ files
- Inconsistent prompt updates
- Risk of missing updates in some services
- Harder to maintain and test
- Amount sign confusion (positive/negative inconsistency)
- Over-aggressive description cleaning
- Poor category matching leading to wrong classifications

### After (Centralized Templates)
- Single source of truth for all prompts
- Consistent updates across all services
- Easy to add new features (bank validation, etc.)
- Better maintainability and testing
- Type-safe variable substitution
- **Enhanced amount detection with clear rules**
- **Original description preservation for user clarity**
- **Smart categorization with "Uncategorized" fallback**

## Future Enhancements

### Planned Features

1. **Bank Statement Validation**
   - Validate bank name and statement period
   - Check document authenticity
   - Extract account information safely

2. **Multi-language Support**
   - Templates in different languages
   - Language-specific categorization

3. **A/B Testing**
   - Multiple template versions
   - Performance comparison
   - Automatic optimization

4. **Template Versioning**
   - Version control for prompts
   - Rollback capabilities
   - Change tracking

### Example: Bank Validation Feature

```typescript
// Future usage for bank validation
const bankValidation = await llmService.validateBankStatement(documentText);

// Result:
{
  bank_name: "State Bank of India",
  statement_period: {
    from_date: "2024-01-01",
    to_date: "2024-01-31",
    month: "2024-01"
  },
  account_number: "***1234",
  is_valid_statement: true,
  validation_notes: "Valid SBI statement format"
}
```

## Migration Notes

All existing LLM services have been updated to use the centralized template system:

- ✅ CustomEndpointService
- ✅ GeminiService  
- ✅ AzureOpenAIService
- ✅ OpenAIService

The API remains the same - no changes needed in components or pages that use these services.
