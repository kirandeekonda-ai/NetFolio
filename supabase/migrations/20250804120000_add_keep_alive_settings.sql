-- Add keep alive URL field to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN keep_alive_url TEXT,
ADD COLUMN keep_alive_enabled BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX idx_user_preferences_keep_alive ON user_preferences(user_id, keep_alive_enabled);

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.keep_alive_url IS 'URL to ping every 5 minutes to keep hosting and database alive';
COMMENT ON COLUMN user_preferences.keep_alive_enabled IS 'Whether the keep alive feature is enabled';
