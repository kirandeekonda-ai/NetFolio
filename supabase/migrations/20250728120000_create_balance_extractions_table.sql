-- Create balance_extractions table for storing AI-extracted balance data
-- This tracks balance information extracted from bank statements per page

CREATE TABLE public.balance_extractions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_statement_id uuid NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
    page_number integer NOT NULL DEFAULT 1,
    
    -- Balance amounts (all nullable as balance might not be present on every page)
    opening_balance decimal(15,2),
    closing_balance decimal(15,2), 
    available_balance decimal(15,2),
    current_balance decimal(15,2),
    
    -- Extraction metadata
    balance_confidence integer NOT NULL DEFAULT 0 CHECK (balance_confidence >= 0 AND balance_confidence <= 100),
    balance_extraction_notes text NOT NULL DEFAULT 'No balance information extracted',
    extraction_method text NOT NULL DEFAULT 'ai_llm',
    
    -- Audit fields
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    UNIQUE(bank_statement_id, page_number)
);

-- Row Level Security (RLS)
ALTER TABLE public.balance_extractions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own balance extractions" ON public.balance_extractions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance extractions" ON public.balance_extractions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance extractions" ON public.balance_extractions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own balance extractions" ON public.balance_extractions
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_balance_extractions_user_id ON public.balance_extractions(user_id);
CREATE INDEX idx_balance_extractions_bank_statement_id ON public.balance_extractions(bank_statement_id);
CREATE INDEX idx_balance_extractions_created_at ON public.balance_extractions(created_at);
CREATE INDEX idx_balance_extractions_confidence ON public.balance_extractions(balance_confidence);

-- Comments for documentation
COMMENT ON TABLE public.balance_extractions IS 'Stores AI-extracted balance information from bank statement pages';
COMMENT ON COLUMN public.balance_extractions.opening_balance IS 'Opening balance amount detected on this page';
COMMENT ON COLUMN public.balance_extractions.closing_balance IS 'Closing balance amount detected on this page';
COMMENT ON COLUMN public.balance_extractions.available_balance IS 'Available balance amount detected on this page';
COMMENT ON COLUMN public.balance_extractions.current_balance IS 'Current balance amount detected on this page';
COMMENT ON COLUMN public.balance_extractions.balance_confidence IS 'AI confidence score (0-100) for balance extraction accuracy';
COMMENT ON COLUMN public.balance_extractions.balance_extraction_notes IS 'AI-generated notes about balance detection process';
COMMENT ON COLUMN public.balance_extractions.extraction_method IS 'Method used for balance extraction (ai_llm, manual, calculated)';
