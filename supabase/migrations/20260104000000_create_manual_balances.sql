-- Create manual_balances table for hybrid balance system
CREATE TABLE IF NOT EXISTS manual_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    balance_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_manual_balances_account_date 
ON manual_balances(bank_account_id, balance_date DESC);

-- Add RLS policies
ALTER TABLE manual_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own manual balances"
    ON manual_balances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual balances"
    ON manual_balances FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual balances"
    ON manual_balances FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual balances"
    ON manual_balances FOR DELETE
    USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_manual_balances_updated_at
    BEFORE UPDATE ON manual_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
