-- Add balance protection settings to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN balance_protection_enabled BOOLEAN DEFAULT false,
ADD COLUMN balance_protection_type TEXT CHECK (balance_protection_type IN ('pin', 'password')) DEFAULT 'pin',
ADD COLUMN balance_protection_hash TEXT;

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_balance_protection ON user_preferences(user_id, balance_protection_enabled);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.balance_protection_enabled IS 'Whether balance protection is enabled for privacy';
COMMENT ON COLUMN user_preferences.balance_protection_type IS 'Type of protection: pin (4-6 digits) or password (alphanumeric)';
COMMENT ON COLUMN user_preferences.balance_protection_hash IS 'Hashed PIN/password for verification';
