-- Add onboarded field to user_preferences table for tracking first-time user status
ALTER TABLE user_preferences 
ADD COLUMN onboarded BOOLEAN DEFAULT false;

-- Update any existing users to be considered onboarded if they have transactions
-- This prevents existing users from seeing the welcome wizard
UPDATE user_preferences 
SET onboarded = true 
WHERE user_id IN (
  SELECT DISTINCT u.id 
  FROM auth.users u 
  WHERE u.created_at < NOW() - INTERVAL '1 day'
);
