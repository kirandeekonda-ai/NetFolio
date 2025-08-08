-- Migration: Transaction Linking System for Inter-Bank Transfers
-- Date: 2025-08-08
-- Description: Add functionality to link transactions between accounts to solve double-counting in income/expense calculations

-- Add transaction linking fields to existing transactions table
DO $$
BEGIN
    -- Add linked_transaction_id for pairing transactions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'linked_transaction_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
    END IF;

    -- Add transfer_pair_id to group related transfers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'transfer_pair_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN transfer_pair_id UUID;
    END IF;

    -- Add is_internal_transfer flag for calculations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'is_internal_transfer'
    ) THEN
        ALTER TABLE transactions ADD COLUMN is_internal_transfer BOOLEAN DEFAULT false;
    END IF;

    -- Add transfer_detection_confidence for AI suggestions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'transfer_detection_confidence'
    ) THEN
        ALTER TABLE transactions ADD COLUMN transfer_detection_confidence DECIMAL(3,2) CHECK (transfer_detection_confidence >= 0 AND transfer_detection_confidence <= 1);
    END IF;

    -- Add transfer_notes for user annotations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'transfer_notes'
    ) THEN
        ALTER TABLE transactions ADD COLUMN transfer_notes TEXT;
    END IF;

END $$;

-- Create indexes for efficient transfer linking queries
CREATE INDEX IF NOT EXISTS idx_transactions_linked_transaction_id ON transactions(linked_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pair_id ON transactions(transfer_pair_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_internal_transfer ON transactions(is_internal_transfer);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_detection ON transactions(transfer_detection_confidence) WHERE transfer_detection_confidence IS NOT NULL;

-- Add combined index for transfer detection queries
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_detection_combo ON transactions(user_id, transaction_date, amount, is_internal_transfer) WHERE is_internal_transfer = false;

-- Create function to automatically generate transfer pair IDs
CREATE OR REPLACE FUNCTION generate_transfer_pair_id()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- Create function to link two transactions as transfers
CREATE OR REPLACE FUNCTION link_transactions_as_transfer(
    transaction_id_1 UUID,
    transaction_id_2 UUID,
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    pair_id UUID;
BEGIN
    -- Generate a new pair ID
    pair_id := generate_transfer_pair_id();
    
    -- Update both transactions with linking information
    UPDATE transactions 
    SET 
        linked_transaction_id = transaction_id_2,
        transfer_pair_id = pair_id,
        is_internal_transfer = true,
        transfer_detection_confidence = confidence_score,
        transfer_notes = notes,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = transaction_id_1;
    
    UPDATE transactions 
    SET 
        linked_transaction_id = transaction_id_1,
        transfer_pair_id = pair_id,
        is_internal_transfer = true,
        transfer_detection_confidence = confidence_score,
        transfer_notes = notes,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = transaction_id_2;
    
    RETURN pair_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to unlink transactions
CREATE OR REPLACE FUNCTION unlink_transactions(
    transaction_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    linked_id UUID;
BEGIN
    -- Get the linked transaction ID
    SELECT linked_transaction_id INTO linked_id 
    FROM transactions 
    WHERE id = transaction_id;
    
    -- Unlink both transactions
    UPDATE transactions 
    SET 
        linked_transaction_id = NULL,
        transfer_pair_id = NULL,
        is_internal_transfer = false,
        transfer_detection_confidence = NULL,
        transfer_notes = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = transaction_id OR id = linked_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect potential transfers
CREATE OR REPLACE FUNCTION detect_potential_transfers(
    user_id_param UUID,
    date_tolerance_days INTEGER DEFAULT 1,
    amount_tolerance_percent DECIMAL(5,2) DEFAULT 1.0
) RETURNS TABLE (
    transaction_1_id UUID,
    transaction_2_id UUID,
    confidence_score DECIMAL(3,2),
    amount_diff DECIMAL(15,2),
    date_diff INTEGER,
    description_1 TEXT,
    description_2 TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t1.id as transaction_1_id,
        t2.id as transaction_2_id,
        CASE 
            WHEN ABS(t1.amount + t2.amount) = 0 AND ABS(t1.transaction_date - t2.transaction_date) = 0 THEN 0.95
            WHEN ABS(t1.amount + t2.amount) <= (ABS(t1.amount) * amount_tolerance_percent / 100) 
                 AND ABS(t1.transaction_date - t2.transaction_date) <= date_tolerance_days THEN 0.85
            ELSE 0.70
        END as confidence_score,
        ABS(t1.amount + t2.amount) as amount_diff,
        ABS(t1.transaction_date - t2.transaction_date) as date_diff,
        t1.description as description_1,
        t2.description as description_2
    FROM transactions t1
    JOIN transactions t2 ON (
        t1.user_id = t2.user_id 
        AND t1.id != t2.id
        AND t1.user_id = user_id_param
        AND t1.bank_account_id != t2.bank_account_id  -- Different accounts
        AND t1.is_internal_transfer = false
        AND t2.is_internal_transfer = false
        AND t1.linked_transaction_id IS NULL
        AND t2.linked_transaction_id IS NULL
        AND ABS(t1.transaction_date - t2.transaction_date) <= date_tolerance_days
        AND ABS(t1.amount + t2.amount) <= GREATEST(ABS(t1.amount), ABS(t2.amount)) * amount_tolerance_percent / 100
        AND SIGN(t1.amount) != SIGN(t2.amount)  -- Opposite signs (one positive, one negative)
    )
    WHERE 
        -- Add pattern matching for transfer descriptions
        (t1.description ~* '(neft|rtgs|imps|upi|transfer|fund|remit)' 
         OR t2.description ~* '(neft|rtgs|imps|upi|transfer|fund|remit)')
    ORDER BY confidence_score DESC, amount_diff ASC, date_diff ASC;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for new columns
-- The existing RLS policies on transactions table will automatically apply to new columns

-- Add helpful comments
COMMENT ON COLUMN transactions.linked_transaction_id IS 'Reference to the paired transaction in a transfer (bidirectional linking)';
COMMENT ON COLUMN transactions.transfer_pair_id IS 'UUID to group related transfer transactions together';
COMMENT ON COLUMN transactions.is_internal_transfer IS 'Flag indicating this transaction is an internal transfer between user accounts';
COMMENT ON COLUMN transactions.transfer_detection_confidence IS 'AI confidence score for transfer detection (0.0 to 1.0)';
COMMENT ON COLUMN transactions.transfer_notes IS 'User notes about the transfer relationship';

COMMENT ON FUNCTION link_transactions_as_transfer IS 'Links two transactions as a transfer pair with metadata';
COMMENT ON FUNCTION unlink_transactions IS 'Removes transfer linking from transactions';
COMMENT ON FUNCTION detect_potential_transfers IS 'AI function to detect potential transfer pairs based on amount, date, and description patterns';

-- Create a view for easy transfer analysis
CREATE OR REPLACE VIEW transfer_pairs AS
SELECT 
    t1.transfer_pair_id,
    t1.id as transaction_1_id,
    t1.description as description_1,
    t1.amount as amount_1,
    t1.transaction_date as date_1,
    ba1.bank_name as bank_1,
    ba1.account_nickname as account_1_nickname,
    t2.id as transaction_2_id,
    t2.description as description_2,
    t2.amount as amount_2,
    t2.transaction_date as date_2,
    ba2.bank_name as bank_2,
    ba2.account_nickname as account_2_nickname,
    t1.transfer_detection_confidence,
    t1.transfer_notes,
    t1.user_id
FROM transactions t1
JOIN transactions t2 ON t1.linked_transaction_id = t2.id
LEFT JOIN bank_accounts ba1 ON t1.bank_account_id = ba1.id
LEFT JOIN bank_accounts ba2 ON t2.bank_account_id = ba2.id
WHERE t1.transfer_pair_id IS NOT NULL
AND t1.id < t2.id  -- Avoid duplicate rows
ORDER BY t1.transfer_pair_id;

-- Grant appropriate permissions
GRANT SELECT ON transfer_pairs TO authenticated;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Transaction linking system migration completed successfully';
    RAISE NOTICE 'Added columns: linked_transaction_id, transfer_pair_id, is_internal_transfer, transfer_detection_confidence, transfer_notes';
    RAISE NOTICE 'Added functions: link_transactions_as_transfer, unlink_transactions, detect_potential_transfers';
    RAISE NOTICE 'Added view: transfer_pairs for easy transfer analysis';
END $$;
