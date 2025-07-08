# LLM Provider Configuration Feature

## Overview
This feature allows users to configure their preferred Large Language Model (LLM) services from the user profile page. Users can add, test, and manage multiple LLM providers including Google Gemini, Azure OpenAI, OpenAI, and custom endpoints.

## Features Implemented

### 🔧 Backend Infrastructure
- **Database Migration**: `supabase/migrations/20250708000000_create_llm_providers_table.sql`
  - Creates `llm_providers` table with RLS policies
  - Supports multiple provider types and configurations
  - Tracks test status and error information

- **TypeScript Types**: `src/types/llm.ts`
  - Comprehensive type definitions for all supported providers
  - Provider templates with required/optional fields
  - Test response and configuration interfaces

- **API Endpoints**:
  - `src/pages/api/llm-providers.ts` - CRUD operations for LLM providers
  - `src/pages/api/llm-providers/test.ts` - Test LLM configurations
  - Authentication and user isolation implemented

### 🎨 Frontend Components
- **LLMProviderSettings**: Main container component
- **LLMProviderForm**: Dynamic form for adding/editing providers
- **LLMProviderList**: Display and manage existing providers
- **Custom Hook**: `src/hooks/useLLMProviders.ts` for state management

### 🔐 Security Features
- Row Level Security (RLS) on database tables
- API key encryption (ready for implementation)
- User-specific provider isolation
- Secure server-side API testing

## Supported LLM Providers

### 1. Google Gemini API
- **Model**: gemini-2.0-flash (default)
- **Required**: API key, model name
- **Endpoint**: Google's Generative Language API

### 2. Azure OpenAI
- **Models**: gpt-4o-mini, gpt-4, gpt-3.5-turbo
- **Required**: API key, resource name, deployment name, API version
- **Example URI**: `https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-08-01-preview`

### 3. OpenAI API
- **Models**: gpt-4o-mini, gpt-4, gpt-3.5-turbo
- **Required**: API key, model name
- **Endpoint**: OpenAI's official API

### 4. Custom Endpoints
- **Flexible**: Any OpenAI-compatible API
- **Required**: API endpoint, model name
- **Optional**: API key (for secured endpoints)

## Configuration Guide

### For Azure OpenAI (Your Use Case)
Given your URI: `https://testkiranazureai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview`

**Configuration Values**:
- **Provider Type**: Azure OpenAI
- **Provider Name**: "My Azure OpenAI" (or any name)
- **Azure Resource Name**: `testkiranazureai`
- **Azure Deployment Name**: `gpt-4o-mini`
- **Azure API Version**: `2024-08-01-preview`
- **API Key**: [Your Azure OpenAI API key from Azure portal]

### Network Considerations
- Corporate firewalls may block AI service endpoints
- Consider proxy settings or network exceptions
- Test connectivity from the same network environment

## Usage Flow

1. **Navigate to Profile Page**: `/profile`
2. **Access LLM Settings**: Scroll to "LLM Provider Configuration"
3. **Add Provider**: Click "Add Provider" button
4. **Configure**: Select provider type and fill required fields
5. **Test**: Use "Test Now" to verify configuration
6. **Save**: Click "Add Provider" to save working configuration
7. **Manage**: Edit, test, or delete existing providers

## Database Schema

```sql
CREATE TABLE llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('gemini', 'azure_openai', 'openai', 'custom')),
  
  -- Configuration fields
  api_endpoint TEXT,
  api_key TEXT,
  model_name TEXT,
  azure_resource_name TEXT,
  azure_deployment_name TEXT,
  azure_api_version TEXT,
  additional_config JSONB,
  
  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  test_error TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Future Enhancements

### Security
- [ ] Implement API key encryption at rest
- [ ] Add API key rotation functionality
- [ ] Implement rate limiting per provider

### Features
- [ ] Provider usage analytics
- [ ] Automatic failover between providers
- [ ] Cost tracking and budgets
- [ ] Model-specific parameters configuration

### UI/UX
- [ ] Provider setup wizard
- [ ] Bulk import/export configurations
- [ ] Real-time status monitoring
- [ ] Performance metrics dashboard

## Troubleshooting

### Common Issues

**"Unauthorized" Error**:
1. Verify API key is correct and active
2. Check provider-specific configuration (resource names, deployments)
3. Ensure network connectivity to provider endpoints
4. Verify account permissions on the provider platform

**Network Connectivity**:
1. Check corporate firewall settings
2. Test with different network (mobile hotspot)
3. Consider using proxy settings
4. Contact IT for endpoint whitelisting

**Configuration Errors**:
1. Double-check all required fields
2. Verify API versions match provider requirements
3. Ensure deployment names match exactly
4. Test configuration outside the application first

## Development Notes

### Adding New Providers
1. Update `LLMProviderType` in `src/types/llm.ts`
2. Add provider template to `LLM_PROVIDER_TEMPLATES`
3. Implement test function in `src/pages/api/llm-providers/test.ts`
4. Update form validation in `LLMProviderForm.tsx`

### Testing
- Use provided test scripts for debugging
- Check browser network tab for API call details
- Review server logs for detailed error messages
- Test with minimal configuration first

## Files Modified/Created

### New Files
- `src/types/llm.ts` - LLM provider types and templates
- `src/hooks/useLLMProviders.ts` - React hook for provider management
- `src/components/LLMProviderSettings.tsx` - Main settings component
- `src/components/LLMProviderForm.tsx` - Provider configuration form
- `src/components/LLMProviderList.tsx` - Provider list and management
- `src/pages/api/llm-providers.ts` - CRUD API endpoints
- `src/pages/api/llm-providers/test.ts` - Provider testing API
- `supabase/migrations/20250708000000_create_llm_providers_table.sql` - Database schema

### Modified Files
- `src/components/UserSettings.tsx` - Added LLM provider section
- `src/utils/supabase.ts` - Added server-side Supabase client
- `package.json` - Added missing dependencies
- `.gitignore` - Excluded test and debug files

---

**Status**: ✅ Feature Complete - Ready for testing once network connectivity is resolved
**Next Steps**: Test with proper network access, then integrate with transaction categorization features
