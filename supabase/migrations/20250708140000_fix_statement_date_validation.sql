-- Fix statement date validation function
-- The issue is with comparing date subtraction result (integer) with INTERVAL

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS trigger_validate_statement_dates ON bank_statements;
DROP FUNCTION IF EXISTS validate_statement_dates();

-- Recreate the validation function with correct date comparison
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
    
    -- Check that it covers at least 25 days (proper date arithmetic)
    IF NEW.statement_end_date - NEW.statement_start_date < 25 THEN
        RAISE EXCEPTION 'Statement must cover at least 25 days to be considered a monthly statement';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_validate_statement_dates
    BEFORE INSERT OR UPDATE ON bank_statements
    FOR EACH ROW
    EXECUTE FUNCTION validate_statement_dates();
