-- Create Banks Table for Indian Bank Data with Logos
-- This table stores predefined bank information for autocomplete functionality

CREATE TABLE banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(255) NOT NULL UNIQUE,
    bank_code VARCHAR(10) UNIQUE, -- IFSC prefix or bank code
    logo_url TEXT, -- URL to bank logo
    bank_type VARCHAR(50) DEFAULT 'commercial', -- 'commercial', 'cooperative', 'regional', 'foreign'
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0, -- For sorting popular banks first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast search
CREATE INDEX idx_banks_name_search ON banks USING gin(to_tsvector('english', bank_name));
CREATE INDEX idx_banks_active ON banks(is_active);
CREATE INDEX idx_banks_display_order ON banks(display_order DESC, bank_name);

-- Insert popular Indian banks with their data
INSERT INTO banks (bank_name, bank_code, logo_url, bank_type, display_order) VALUES
-- Top Private Banks
('HDFC Bank', 'HDFC', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/HDFC%20Bank.svg', 'commercial', 100),
('ICICI Bank', 'ICIC', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/ICICI%20Bank.svg', 'commercial', 95),
('Axis Bank', 'UTIB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Axis%20Bank.svg', 'commercial', 90),
('Kotak Mahindra Bank', 'KKBK', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Kotak%20Mahindra%20Bank.svg', 'commercial', 85),
('Yes Bank', 'YESB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/YES%20Bank.svg', 'commercial', 80),
('IndusInd Bank', 'INDB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/IndusInd%20Bank.svg', 'commercial', 75),

-- Public Sector Banks
('State Bank of India', 'SBIN', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/State%20Bank%20of%20India.svg', 'commercial', 98),
('Punjab National Bank', 'PUNB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Punjab%20National%20Bank.svg', 'commercial', 92),
('Bank of Baroda', 'BARB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Bank%20of%20Baroda.svg', 'commercial', 88),
('Canara Bank', 'CNRB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Canara%20Bank.svg', 'commercial', 83),
('Union Bank of India', 'UBIN', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Union%20Bank%20of%20India.svg', 'commercial', 78),
('Bank of India', 'BKID', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Bank%20of%20India.svg', 'commercial', 73),
('Central Bank of India', 'CBIN', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Central%20Bank%20of%20India.svg', 'commercial', 68),
('Indian Bank', 'IDIB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Indian%20Bank.svg', 'commercial', 63),
('Indian Overseas Bank', 'IOBA', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Indian%20Overseas%20Bank.svg', 'commercial', 58),
('Punjab & Sind Bank', 'PSIB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Punjab%20%26%20Sind%20Bank.svg', 'commercial', 53),
('UCO Bank', 'UCBA', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/UCO%20Bank.svg', 'commercial', 48),

-- Small Finance Banks & Others
('Paytm Payments Bank', 'PYTM', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Paytm%20Payments%20Bank.svg', 'commercial', 70),
('Airtel Payments Bank', 'AIRP', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Airtel%20Payments%20Bank.svg', 'commercial', 65),
('Fino Payments Bank', 'FINO', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Fino%20Payments%20Bank.svg', 'commercial', 60),
('Jio Payments Bank', 'JIOP', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Jio%20Payments%20Bank.svg', 'commercial', 55),

-- Regional Banks
('South Indian Bank', 'SIBL', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/South%20Indian%20Bank.svg', 'regional', 50),
('Karnataka Bank', 'KARB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Karnataka%20Bank.svg', 'regional', 45),
('Federal Bank', 'FDRL', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Federal%20Bank.svg', 'regional', 40),
('City Union Bank', 'CIUB', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/City%20Union%20Bank.svg', 'regional', 35),
('Jammu & Kashmir Bank', 'JAKA', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Jammu%20%26%20Kashmir%20Bank.svg', 'regional', 30),

-- Foreign Banks Popular in India
('Citibank', 'CITI', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Citibank.svg', 'foreign', 25),
('HSBC Bank', 'HSBC', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/HSBC.svg', 'foreign', 20),
('Standard Chartered Bank', 'SCBL', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Standard%20Chartered.svg', 'foreign', 15),
('Deutsche Bank', 'DEUT', 'https://cdn.jsdelivr.net/gh/Apoorva64/bank-logos@main/Deutsche%20Bank.svg', 'foreign', 10);

-- Create a function to search banks by name
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
            OR to_tsvector('english', b.bank_name) @@ plainto_tsquery('english', search_term)
        )
    ORDER BY 
        b.display_order DESC,
        b.bank_name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE banks IS 'Predefined bank information for autocomplete functionality with logos and metadata';
COMMENT ON FUNCTION search_banks IS 'Search banks by name with ranking based on popularity';
