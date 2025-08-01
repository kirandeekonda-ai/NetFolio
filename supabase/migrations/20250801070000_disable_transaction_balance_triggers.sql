-- Disable Transaction-Based Balance Triggers
-- Since we're now using simplified statement-based balance management,
-- we need to disable the old triggers that update current_balance from transactions

-- Drop the triggers that automatically update account balances
DROP TRIGGER IF EXISTS trigger_update_balance_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_update ON transactions;
DROP TRIGGER IF EXISTS trigger_update_balance_delete ON transactions;

-- Drop the function since it's no longer needed
DROP FUNCTION IF EXISTS update_account_balance();

-- Clear all existing current_balance values to prevent confusion
-- The SimplifiedBalanceService will now be the single source of truth
UPDATE bank_accounts 
SET current_balance = NULL 
WHERE current_balance IS NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN bank_accounts.current_balance IS 'DEPRECATED: No longer automatically calculated. Use SimplifiedBalanceService for statement-based balances.';
