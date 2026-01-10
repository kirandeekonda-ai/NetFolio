
-- Create recurring_items table
CREATE TABLE IF NOT EXISTS recurring_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    amount NUMERIC, -- Optional default amount
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    reminder_type TEXT CHECK (reminder_type IN ('bill', 'sip')),
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy for recurring_items (Users can only see/edit their own items)
ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring items" ON recurring_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring items" ON recurring_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring items" ON recurring_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring items" ON recurring_items
    FOR DELETE USING (auth.uid() = user_id);


-- Create recurring_payment_log table
CREATE TABLE IF NOT EXISTS recurring_payment_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES recurring_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    payment_date DATE NOT NULL,
    month_year TEXT NOT NULL, -- Format 'YYYY-MM'
    status TEXT CHECK (status IN ('paid', 'skipped')),
    actual_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, month_year) -- Prevent duplicate payments for same month
);

-- Policy for payment_log
ALTER TABLE recurring_payment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment logs" ON recurring_payment_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment logs" ON recurring_payment_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment logs" ON recurring_payment_log
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment logs" ON recurring_payment_log
    FOR DELETE USING (auth.uid() = user_id);
