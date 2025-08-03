-- Update Banks Table with Comprehensive Indian Bank Data
-- Based on data from https://github.com/praveenpuglia/indian-banks
-- This replaces the limited data with comprehensive Indian bank information

-- First, clear existing data
TRUNCATE TABLE banks;

-- Insert comprehensive Indian banks data with proper logos and metadata
INSERT INTO banks (bank_name, bank_code, logo_url, bank_type, display_order) VALUES
-- Major Private Banks (High Priority)
('HDFC Bank', 'HDFC', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/hdfc/logo.svg', 'commercial', 100),
('ICICI Bank', 'ICIC', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/icic/logo.svg', 'commercial', 95),
('Axis Bank', 'UTIB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/utib/logo.svg', 'commercial', 90),
('Kotak Mahindra Bank', 'KKBK', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/kkbk/logo.svg', 'commercial', 85),
('Yes Bank', 'YESB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/yesb/logo.svg', 'commercial', 80),
('IndusInd Bank', 'INDB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/indb/logo.svg', 'commercial', 75),

-- Major Public Sector Banks
('State Bank of India', 'SBIN', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/sbin/logo.svg', 'commercial', 98),
('Punjab National Bank', 'PUNB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/punb/logo.svg', 'commercial', 92),
('Bank of Baroda', 'BARB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/barb/logo.svg', 'commercial', 88),
('Canara Bank', 'CNRB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/cnrb/logo.svg', 'commercial', 83),
('Union Bank of India', 'UBIN', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ubin/logo.svg', 'commercial', 78),
('Bank of India', 'BKID', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/bkid/logo.svg', 'commercial', 73),
('Central Bank of India', 'CBIN', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/cbin/logo.svg', 'commercial', 68),
('Indian Bank', 'IDIB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/idib/logo.svg', 'commercial', 63),
('Indian Overseas Bank', 'IOBA', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ioba/logo.svg', 'commercial', 58),
('Punjab & Sind Bank', 'PSIB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/psib/logo.svg', 'commercial', 53),
('UCO Bank', 'UCBA', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ucba/logo.svg', 'commercial', 48),
('Bank of Maharashtra', 'MAHB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/mahb/logo.svg', 'commercial', 43),

-- Small Finance & Payment Banks
('Bandhan Bank', 'BDBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/bdbl/logo.svg', 'commercial', 70),
('AU Small Finance Bank', 'AUBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/aubl/logo.svg', 'commercial', 65),
('RBL Bank', 'RATN', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ratn/logo.svg', 'commercial', 60),
('IDFC First Bank', 'IDFB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/idfb/logo.svg', 'commercial', 55),
('IDBI Bank', 'IBKL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ibkl/logo.svg', 'commercial', 50),

-- Regional Banks
('South Indian Bank', 'SIBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/sibl/logo.svg', 'regional', 45),
('Karnataka Bank', 'KARB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/karb/logo.svg', 'regional', 40),
('Federal Bank', 'FDRL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/fdrl/logo.svg', 'regional', 35),
('City Union Bank', 'CIUB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ciub/logo.svg', 'regional', 30),
('Jammu & Kashmir Bank', 'JAKA', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/jaka/logo.svg', 'regional', 25),
('Karur Vysya Bank', 'KVBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/kvbl/logo.svg', 'regional', 20),
('Dhanalakshmi Bank', 'DLXB', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/dlxb/logo.svg', 'regional', 15),
('Tamilnad Mercantile Bank', 'TMBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/tmbl/logo.svg', 'regional', 10),
('The Nainital Bank', 'NTBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/ntbl/logo.svg', 'regional', 5),

-- Other Banks
('CSB Bank', 'CSBK', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/csbk/logo.svg', 'commercial', 38),
('DCB Bank', 'DCBL', 'https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/dcbl/logo.svg', 'commercial', 33);

-- Update the search function to handle better ranking
DROP FUNCTION IF EXISTS search_banks(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION search_banks(search_term TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    bank_name TEXT,
    bank_code TEXT,
    logo_url TEXT,
    bank_type TEXT,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.bank_name::TEXT,
        b.bank_code::TEXT,
        b.logo_url::TEXT,
        b.bank_type::TEXT,
        b.display_order
    FROM banks b
    WHERE 
        b.is_active = true
        AND (
            search_term = '' 
            OR b.bank_name ILIKE '%' || search_term || '%'
            OR b.bank_code ILIKE '%' || search_term || '%'
            OR to_tsvector('english', b.bank_name) @@ plainto_tsquery('english', search_term)
        )
    ORDER BY 
        -- Exact matches first
        CASE WHEN LOWER(b.bank_name) = LOWER(search_term) THEN 1 ELSE 0 END DESC,
        -- Then partial matches at the beginning
        CASE WHEN LOWER(b.bank_name) LIKE LOWER(search_term) || '%' THEN 1 ELSE 0 END DESC,
        -- Then by popularity (display_order)
        b.display_order DESC,
        -- Finally alphabetical
        b.bank_name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE banks IS 'Comprehensive Indian bank information with logos from praveenpuglia/indian-banks repository';
COMMENT ON FUNCTION search_banks IS 'Enhanced search with exact match prioritization and popularity ranking';

-- Create index for better search performance
DROP INDEX IF EXISTS idx_banks_name_code_search;
CREATE INDEX idx_banks_name_code_search ON banks USING gin(
    to_tsvector('english', bank_name || ' ' || COALESCE(bank_code, ''))
);
