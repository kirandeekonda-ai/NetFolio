-- Add DBS Bank India to the banks table
-- DBS is a major foreign bank operating in India

INSERT INTO banks (bank_name, bank_code, logo_url, bank_type, display_order) VALUES
('DBS Bank India', 'DBSI', '/bank-logos/dbsi.png', 'foreign', 77);

-- Add comment about DBS Bank addition
COMMENT ON TABLE banks IS 'Comprehensive Indian bank information including foreign banks like DBS operating in India';
