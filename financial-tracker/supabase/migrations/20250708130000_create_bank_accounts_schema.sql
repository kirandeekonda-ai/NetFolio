-- Bank Accounts and Statement Management Schema
-- This migration adds support for managing multiple bank accounts and tracking monthly statements

-- Bank Accounts Table
-- Stores user's bank accounts with their starting balances
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'checking', 'savings', 'credit', 'investment'
    account_number_last4 VARCHAR(4), -- Only store last 4 digits for security
    account_nickname VARCHAR(255), -- User-friendly name like "Main Checking"
    starting_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    starting_balance_date DATE NOT NULL,
    current_balance DECIMAL(15,2), -- Calculated from transactions
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient user queries
CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX idx_bank_accounts_active ON bank_accounts(user_id, is_active);

-- Bank Statements Table
-- Tracks which statements have been uploaded for each account
CREATE TABLE bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE NOT NULL,
    statement_month INTEGER NOT NULL, -- 1-12
    statement_year INTEGER NOT NULL,
    statement_start_date DATE NOT NULL,
    statement_end_date DATE NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    total_credits DECIMAL(15,2) DEFAULT 0,
    total_debits DECIMAL(15,2) DEFAULT 0,
    file_name VARCHAR(500), -- Original filename
    file_size_mb DECIMAL(8,2), -- File size for tracking
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT, -- Store any processing errors
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one statement per month per account
    UNIQUE(bank_account_id, statement_year, statement_month)
);

-- Indexes for efficient queries
CREATE INDEX idx_bank_statements_user_id ON bank_statements(user_id);
CREATE INDEX idx_bank_statements_account_id ON bank_statements(bank_account_id);
CREATE INDEX idx_bank_statements_period ON bank_statements(statement_year, statement_month);
CREATE INDEX idx_bank_statements_status ON bank_statements(processing_status);

-- Enhanced Transactions Table
-- Extend existing transaction tracking with bank account context
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    bank_statement_id UUID REFERENCES bank_statements(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL, -- Positive for credits, negative for debits
    transaction_type VARCHAR(20) NOT NULL, -- 'income', 'expense', 'transfer'
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(255), -- Denormalized for performance
    is_transfer BOOLEAN DEFAULT false,
    transfer_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL, -- For transfers between accounts
    reference_number VARCHAR(100), -- Check number, reference ID, etc.
    balance_after DECIMAL(15,2), -- Running balance if available from statement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(bank_account_id);
CREATE INDEX idx_transactions_statement_id ON transactions(bank_statement_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- Function to update account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current balance for the associated bank account
    UPDATE bank_accounts 
    SET 
        current_balance = (
            SELECT 
                starting_balance + COALESCE(SUM(amount), 0)
            FROM transactions 
            WHERE bank_account_id = COALESCE(NEW.bank_account_id, OLD.bank_account_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.bank_account_id, OLD.bank_account_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain account balances
CREATE TRIGGER trigger_update_balance_insert
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER trigger_update_balance_update
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

CREATE TRIGGER trigger_update_balance_delete
    AFTER DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- Function to validate statement date ranges
CREATE OR REPLACE FUNCTION validate_statement_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure statement covers a full month
    IF EXTRACT(YEAR FROM NEW.statement_start_date) != NEW.statement_year OR
       EXTRACT(MONTH FROM NEW.statement_start_date) != NEW.statement_month THEN
        RAISE EXCEPTION 'Statement start date must be in the specified year and month';
    END IF;
    
    -- Ensure end date is after start date
    IF NEW.statement_end_date <= NEW.statement_start_date THEN
        RAISE EXCEPTION 'Statement end date must be after start date';
    END IF;
    
    -- Ideally, check that it covers most of the month (at least 25 days)
    IF NEW.statement_end_date - NEW.statement_start_date < INTERVAL '25 days' THEN
        RAISE EXCEPTION 'Statement must cover at least 25 days to be considered a monthly statement';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for statement validation
CREATE TRIGGER trigger_validate_statement_dates
    BEFORE INSERT OR UPDATE ON bank_statements
    FOR EACH ROW
    EXECUTE FUNCTION validate_statement_dates();

-- RLS (Row Level Security) Policies
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Bank accounts policies
CREATE POLICY "Users can view their own bank accounts" ON bank_accounts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bank accounts" ON bank_accounts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts
    FOR DELETE USING (user_id = auth.uid());

-- Bank statements policies
CREATE POLICY "Users can view their own bank statements" ON bank_statements
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own bank statements" ON bank_statements
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bank statements" ON bank_statements
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own bank statements" ON bank_statements
    FOR DELETE USING (user_id = auth.uid());

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (user_id = auth.uid());

-- Add some helpful views for common queries

-- View to get account summary with latest statement info
CREATE VIEW account_summary AS
SELECT 
    ba.id,
    ba.user_id,
    ba.bank_name,
    ba.account_type,
    ba.account_nickname,
    ba.starting_balance,
    ba.current_balance,
    ba.currency,
    ba.is_active,
    COUNT(bs.id) as statement_count,
    MAX(bs.statement_year * 100 + bs.statement_month) as latest_statement_period,
    MAX(bs.uploaded_at) as last_upload
FROM bank_accounts ba
LEFT JOIN bank_statements bs ON ba.id = bs.bank_account_id
GROUP BY ba.id, ba.user_id, ba.bank_name, ba.account_type, ba.account_nickname, 
         ba.starting_balance, ba.current_balance, ba.currency, ba.is_active;

-- View to check statement completion for current year
CREATE VIEW statement_completion AS
SELECT 
    ba.id as account_id,
    ba.user_id,
    ba.bank_name,
    ba.account_nickname,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    generate_series(1, 12) as month,
    CASE WHEN bs.id IS NOT NULL THEN true ELSE false END as has_statement,
    bs.processing_status,
    bs.uploaded_at
FROM bank_accounts ba
CROSS JOIN generate_series(1, 12) as month
LEFT JOIN bank_statements bs ON ba.id = bs.bank_account_id 
    AND bs.statement_year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND bs.statement_month = month
WHERE ba.is_active = true
ORDER BY ba.bank_name, ba.account_nickname, month;

-- Grant necessary permissions
GRANT ALL ON bank_accounts TO authenticated;
GRANT ALL ON bank_statements TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT SELECT ON account_summary TO authenticated;
GRANT SELECT ON statement_completion TO authenticated;
