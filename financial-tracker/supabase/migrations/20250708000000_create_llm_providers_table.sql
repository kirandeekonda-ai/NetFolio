-- Migration: Create LLM configuration table
-- Date: 2025-07-08
-- Description: Add support for user-configurable LLM providers

-- Create LLM providers table
CREATE TABLE llm_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Gemini API", "Azure OpenAI", "Custom"
    provider_type TEXT NOT NULL CHECK (provider_type IN ('gemini', 'azure_openai', 'openai', 'custom')),
    
    -- Configuration settings
    api_endpoint TEXT, -- For custom/self-hosted endpoints
    api_key TEXT, -- Encrypted API key
    model_name TEXT, -- e.g., "gemini-2.0-flash", "gpt-4o-mini"
    
    -- Azure-specific settings
    azure_resource_name TEXT,
    azure_deployment_name TEXT,
    azure_api_version TEXT,
    
    -- Additional configuration as JSON
    additional_config JSONB DEFAULT '{}',
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending', null)),
    test_error TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, name), -- Each user can have unique provider names
    CHECK (
        -- Ensure at least one user has a default provider
        NOT (is_default = TRUE AND is_active = FALSE)
    )
);

-- Create index for faster queries
CREATE INDEX idx_llm_providers_user_id ON llm_providers(user_id);
CREATE INDEX idx_llm_providers_active ON llm_providers(user_id, is_active, is_default);

-- Create function to ensure only one default provider per user
CREATE OR REPLACE FUNCTION ensure_single_default_llm_provider()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this provider as default, remove default from others
    IF NEW.is_default = TRUE THEN
        UPDATE llm_providers 
        SET is_default = FALSE, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    
    -- Ensure at least one active provider exists for the user
    IF NEW.is_active = FALSE AND OLD.is_default = TRUE THEN
        -- If deactivating the default provider, make another one default
        UPDATE llm_providers 
        SET is_default = TRUE, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_active = TRUE
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_ensure_single_default_llm_provider
    BEFORE UPDATE ON llm_providers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_llm_provider();

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_llm_providers_updated_at
    BEFORE UPDATE ON llm_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE llm_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own LLM providers
CREATE POLICY "Users can manage their own LLM providers" ON llm_providers
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON llm_providers TO authenticated;
GRANT USAGE ON SEQUENCE llm_providers_id_seq TO authenticated;
