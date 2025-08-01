-- Remove Balance Fields from Bank Accounts
-- Since we now use statement-based balances as single source of truth,
-- these fields are no longer needed

-- Drop dependent view first
DROP VIEW IF EXISTS account_summary;

-- Remove balance-related columns
ALTER TABLE bank_accounts 
DROP COLUMN IF EXISTS starting_balance,
DROP COLUMN IF EXISTS starting_balance_date,
DROP COLUMN IF EXISTS current_balance;

-- Recreate account_summary view without balance fields
CREATE VIEW account_summary AS
SELECT 
    ba.id,
    ba.user_id,
    ba.bank_name,
    ba.account_type,
    ba.account_nickname,
    ba.currency,
    ba.is_active,
    COUNT(bs.id) as statement_count,
    MAX(bs.statement_year * 100 + bs.statement_month) as latest_statement_period,
    MAX(bs.uploaded_at) as last_upload
FROM bank_accounts ba
LEFT JOIN bank_statements bs ON ba.id = bs.bank_account_id
GROUP BY ba.id, ba.user_id, ba.bank_name, ba.account_type, ba.account_nickname, 
         ba.currency, ba.is_active;

-- Add comment for documentation
COMMENT ON TABLE bank_accounts IS 'Bank account information - balances now managed via bank_statements.closing_balance';
