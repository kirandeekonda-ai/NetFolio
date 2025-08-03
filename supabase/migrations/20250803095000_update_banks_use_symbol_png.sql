-- Update Banks Table to use symbol.png logos instead of logo.svg
-- symbol.png is more compact and better for dropdown interface

-- Update all existing logo URLs to use symbol.png
UPDATE banks SET 
    logo_url = REPLACE(logo_url, '/logo.svg', '/symbol.png'),
    updated_at = CURRENT_TIMESTAMP
WHERE logo_url LIKE '%/logo.svg';

-- Add comment about logo format choice
COMMENT ON COLUMN banks.logo_url IS 'URL to bank symbol.png - compact logo format ideal for UI dropdowns';
