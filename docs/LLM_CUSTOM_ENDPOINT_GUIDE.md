# LLM Provider Configuration

This document explains how to configure the LLM provider system to switch between production LLM services and custom development endpoints.

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Enable custom endpoint for development
NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=true

# Custom endpoint configuration
NEXT_PUBLIC_CUSTOM_LLM_ENDPOINT=https://ai-wrapper.onrender.com/generate
NEXT_PUBLIC_CUSTOM_LLM_API_KEY=your-api-key-if-required
NEXT_PUBLIC_CUSTOM_LLM_NAME=Custom Development Endpoint

# Debug logging (optional)
NEXT_PUBLIC_LLM_DEBUG=true
NEXT_PUBLIC_LLM_LOG_PROMPTS=true
NEXT_PUBLIC_LLM_LOG_RESPONSES=true
```

## How It Works

### Development Mode (Custom Endpoint)
When `NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=true`:
- All LLM requests go to your custom endpoint
- Input format: `{"prompt": "your prompt here"}`
- Expected output: `{"response": "llm response here"}`
- Bypasses production LLM providers

### Production Mode (Standard LLM Providers)
When `NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=false` or not set:
- Uses configured LLM providers (Gemini, Azure OpenAI, OpenAI)
- Follows standard LLM API contracts
- Production-ready authentication and error handling

## Usage Examples

### Basic Usage
```typescript
import { getGlobalLLMService } from '@/lib/llm/EnhancedLLMService';

// Get LLM service (automatically chooses provider based on environment)
const llmService = getGlobalLLMService();

// Extract transactions
const result = await llmService.extractTransactions(pageText);

// Test connection
const testResult = await llmService.testConnection();
```

### Advanced Usage
```typescript
import { createEnhancedLLMService } from '@/lib/llm/EnhancedLLMService';

// Create service with specific fallback provider
const llmService = createEnhancedLLMService(userLLMProvider);

// Get provider information
const providerInfo = llmService.getProviderInfo();
console.log('Current provider:', providerInfo.type);
console.log('Is custom endpoint:', providerInfo.isCustomEndpoint);
```

### Direct Provider Creation
```typescript
import { createLLMProvider } from '@/lib/llm/LLMProviderFactory';
import { createCustomEndpointProvider } from '@/lib/llm/config';

// Create custom endpoint provider
const customProvider = createCustomEndpointProvider({
  endpoint: 'https://ai-wrapper.onrender.com/generate',
  api_key: 'optional-api-key'
});

// Create LLM service instance
const llmService = createLLMProvider(customProvider);
```

## Custom Endpoint Requirements

Your custom endpoint must:

1. **Accept POST requests** with JSON body:
   ```json
   {
     "prompt": "Extract transactions from this text..."
   }
   ```

2. **Return JSON response** with:
   ```json
   {
     "response": "JSON response with transactions array"
   }
   ```

3. **Handle authentication** (if `api_key` is provided):
   - Header: `Authorization: Bearer <api_key>`

4. **Return structured data** for transaction extraction:
   ```json
   {
     "response": "{\"transactions\": [{\"date\": \"2025-01-01\", \"description\": \"Coffee\", \"amount\": -5.50, \"suggested_category\": \"Food\"}]}"
   }
   ```

## Migration Guide

### From Direct LLM Calls
Replace direct LLM provider calls:
```typescript
// Before
const geminiService = new GeminiService(apiKey, modelName);
const result = await geminiService.extractTransactions(pageText);

// After
const llmService = getGlobalLLMService();
const result = await llmService.extractTransactions(pageText);
```

### Adding New LLM Provider Types
1. Add new type to `LLMProviderType` in `src/types/llm.ts`
2. Implement provider class in `src/lib/llm/`
3. Add case to `createLLMProvider` function
4. Test with both custom endpoint and production modes

## Testing

### Test Custom Endpoint
```typescript
import { createCustomEndpointProvider } from '@/lib/llm/config';

const provider = createCustomEndpointProvider({
  endpoint: 'https://ai-wrapper.onrender.com/generate'
});

const testResult = await provider.testConnection();
console.log('Test result:', testResult);
```

### Test Production Providers
```typescript
// Set environment variable to false
process.env.NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT = 'false';

const llmService = getGlobalLLMService(userLLMProvider);
const testResult = await llmService.testConnection();
```

## Deployment Considerations

### Development
- Set `NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=true`
- Use your custom endpoint for development
- Enable debug logging for troubleshooting

### Production
- Set `NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=false` or remove entirely
- Configure proper LLM providers through user interface
- Disable debug logging for performance

### Environment-Specific Deployment
```bash
# development.env
NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=true
NEXT_PUBLIC_CUSTOM_LLM_ENDPOINT=https://ai-wrapper.onrender.com/generate
NEXT_PUBLIC_LLM_DEBUG=true

# production.env
NEXT_PUBLIC_USE_CUSTOM_LLM_ENDPOINT=false
NEXT_PUBLIC_LLM_DEBUG=false
```

This approach ensures clean separation between development and production environments while maintaining the same API contract throughout your application.
