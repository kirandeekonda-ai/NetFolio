-- Create investments_holdings table
CREATE TABLE IF NOT EXISTS investments_holdings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  holder_name TEXT NOT NULL, -- 'Kiran', 'Anusha'
  ticker_symbol TEXT NOT NULL,
  name TEXT NOT NULL, 
  asset_class TEXT NOT NULL, -- 'Equity', 'Mutual Fund', 'ETF'
  sector TEXT, -- 'FMCG', 'Healthcare'
  strategy_bucket TEXT, -- 'Long', 'Swing'
  avg_price NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 0,
  investment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_price NUMERIC, -- Cached LTP
  last_price_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create investment_transactions table
CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  holding_id UUID REFERENCES investments_holdings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'dividend')),
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quantity NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  fees NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE investments_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investments_holdings' AND policyname = 'Users can view their own holdings'
    ) THEN
        CREATE POLICY "Users can view their own holdings" ON investments_holdings FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investments_holdings' AND policyname = 'Users can insert their own holdings'
    ) THEN
        CREATE POLICY "Users can insert their own holdings" ON investments_holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investments_holdings' AND policyname = 'Users can update their own holdings'
    ) THEN
        CREATE POLICY "Users can update their own holdings" ON investments_holdings FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investments_holdings' AND policyname = 'Users can delete their own holdings'
    ) THEN
        CREATE POLICY "Users can delete their own holdings" ON investments_holdings FOR DELETE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investment_transactions' AND policyname = 'Users can view their own transactions'
    ) THEN
        CREATE POLICY "Users can view their own transactions" ON investment_transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investment_transactions' AND policyname = 'Users can insert their own transactions'
    ) THEN
        CREATE POLICY "Users can insert their own transactions" ON investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investment_transactions' AND policyname = 'Users can update their own transactions'
    ) THEN
        CREATE POLICY "Users can update their own transactions" ON investment_transactions FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investment_transactions' AND policyname = 'Users can delete their own transactions'
    ) THEN
        CREATE POLICY "Users can delete their own transactions" ON investment_transactions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;
