-- Migration: Add Groq to LLM provider types (Corrected)
-- Date: 2026-01-11
-- Description: Allow 'groq' as a valid provider_type in llm_providers table

-- 1. Drop the existing constraint (if it exists) to avoid "already exists" errors
ALTER TABLE llm_providers DROP CONSTRAINT IF EXISTS llm_providers_provider_type_check;

-- 2. Add the updated constraint with 'groq' included
ALTER TABLE llm_providers ADD CONSTRAINT llm_providers_provider_type_check 
    CHECK (provider_type IN ('gemini', 'azure_openai', 'openai', 'custom', 'groq'));
