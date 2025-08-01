-- Simplified Balance Management: Add closing_balance to bank_statements
-- This creates a single source of truth for account balances

ALTER TABLE bank_statements 
ADD COLUMN IF NOT EXISTS closing_balance DECIMAL(15,2);

-- Add index for efficient balance queries
CREATE INDEX IF NOT EXISTS idx_bank_statements_closing_balance 
ON bank_statements(bank_account_id, statement_year DESC, statement_month DESC) 
WHERE closing_balance IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bank_statements.closing_balance IS 'Latest statement closing balance - single source of truth for account balance';
