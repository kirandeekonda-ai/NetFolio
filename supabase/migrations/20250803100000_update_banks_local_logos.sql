-- Update Banks Table to use local logo paths instead of GitHub URLs
-- This improves performance and reliability by serving logos from our own assets

-- Update all existing logo URLs to use local paths
UPDATE banks SET 
    logo_url = '/bank-logos/' || bank_code || '.png',
    updated_at = CURRENT_TIMESTAMP
WHERE bank_code IS NOT NULL;

-- Add comment about local logo storage
COMMENT ON COLUMN banks.logo_url IS 'Local path to bank symbol.png - served from /public/bank-logos/ for better performance';
