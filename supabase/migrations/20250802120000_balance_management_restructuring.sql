-- Balance Management Restructuring Migration
-- Consolidates balance_extractions data into bank_statements.closing_balance
-- and removes the balance_extractions table

-- Step 1: Consolidate balance data from balance_extractions to bank_statements
-- For each statement, find the closing balance with highest confidence
DO $$
DECLARE
    statement_record RECORD;
    best_balance DECIMAL(15,2);
    best_confidence INTEGER;
    balance_record RECORD;
BEGIN
    -- Process each statement that has balance extractions
    FOR statement_record IN 
        SELECT DISTINCT bs.id, bs.statement_year, bs.statement_month
        FROM bank_statements bs
        INNER JOIN balance_extractions be ON bs.id = be.bank_statement_id
        WHERE bs.closing_balance IS NULL -- Only process statements without existing closing balance
    LOOP
        -- Find the best closing balance for this statement
        best_balance := NULL;
        best_confidence := 0;
        
        FOR balance_record IN
            SELECT be.closing_balance, be.balance_confidence, be.page_number
            FROM balance_extractions be
            WHERE be.bank_statement_id = statement_record.id
            AND be.closing_balance IS NOT NULL
            ORDER BY be.balance_confidence DESC, be.page_number DESC
        LOOP
            IF balance_record.balance_confidence > best_confidence OR 
               (balance_record.balance_confidence = best_confidence AND best_balance IS NULL) THEN
                best_balance := balance_record.closing_balance;
                best_confidence := balance_record.balance_confidence;
            END IF;
        END LOOP;
        
        -- Update the statement with the best closing balance
        IF best_balance IS NOT NULL THEN
            UPDATE bank_statements 
            SET closing_balance = best_balance,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = statement_record.id;
            
            RAISE NOTICE 'Updated statement %-%: ₹% (confidence: %)', 
                statement_record.statement_year, 
                statement_record.statement_month, 
                best_balance, 
                best_confidence;
        END IF;
    END LOOP;
END $$;

-- Step 2: Create backup table for safety (optional rollback)
CREATE TABLE IF NOT EXISTS balance_extractions_backup AS 
SELECT * FROM balance_extractions;

-- Add comment for documentation
COMMENT ON TABLE balance_extractions_backup IS 'Backup of balance_extractions before table removal - created during balance management restructuring';

-- Step 3: Verify data migration
DO $$
DECLARE
    extraction_count INTEGER;
    statement_count INTEGER;
    migrated_count INTEGER;
BEGIN
    -- Count original extractions with closing balance
    SELECT COUNT(*) INTO extraction_count 
    FROM balance_extractions 
    WHERE closing_balance IS NOT NULL;
    
    -- Count statements that should have received closing balance
    SELECT COUNT(DISTINCT bank_statement_id) INTO statement_count
    FROM balance_extractions 
    WHERE closing_balance IS NOT NULL;
    
    -- Count statements that now have closing balance
    SELECT COUNT(*) INTO migrated_count
    FROM bank_statements bs
    WHERE bs.closing_balance IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM balance_extractions be 
        WHERE be.bank_statement_id = bs.id 
        AND be.closing_balance IS NOT NULL
    );
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Original balance extractions: %', extraction_count;
    RAISE NOTICE '- Unique statements with balance data: %', statement_count;
    RAISE NOTICE '- Statements updated with closing balance: %', migrated_count;
    
    IF migrated_count < statement_count THEN
        RAISE WARNING 'Migration incomplete: % statements expected, % updated', statement_count, migrated_count;
    ELSE
        RAISE NOTICE 'Migration successful: All statements with balance data have been updated';
    END IF;
END $$;

-- Step 4: Drop balance_extractions table (commented out for safety)
-- Uncomment after verifying migration is successful
-- DROP TABLE IF EXISTS balance_extractions;

-- Update comments for documentation
COMMENT ON COLUMN bank_statements.closing_balance IS 'Statement closing balance - consolidated from balance_extractions during restructuring migration';
