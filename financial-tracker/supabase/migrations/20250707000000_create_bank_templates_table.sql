-- Create bank_templates table for storing parsing configurations
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

-- Add an index on identifier for faster lookups
CREATE INDEX idx_bank_templates_identifier ON bank_templates(identifier);

-- Add an index on bank_name and format for filtering
CREATE INDEX idx_bank_templates_bank_format ON bank_templates(bank_name, format);

-- Insert the DBS PDF template configuration
INSERT INTO bank_templates (
    bank_name, 
    format, 
    identifier, 
    parser_module, 
    parser_config
) VALUES (
    'DBS Bank',
    'PDF',
    'dbs_pdf_v1',
    'dbs_pdf_v1.ts',
    '{
        "type": "table_based",
        "headers": [
            "Transaction Date",
            "Value Date", 
            "Details of transaction",
            "Debit",
            "Credit",
            "Balance"
        ],
        "dateColumn": "Transaction Date",
        "dateFormat": "DD-Mon-YYYY",
        "amountColumns": {
            "debit": "Debit",
            "credit": "Credit"
        },
        "descriptionColumns": [
            "Details of transaction",
            "Unassigned"
        ],
        "columnTolerance": 15,
        "rowTolerance": 5,
        "datePattern": "(\\d{2}-[A-Za-z]{3}-\\d{4})",
        "amountCleanPattern": "[^\\d.-]",
        "skipHeaderLines": 1,
        "multiLineDescription": true
    }'::jsonb
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER bank_templates_updated_at_trigger
    BEFORE UPDATE ON bank_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_templates_updated_at();
