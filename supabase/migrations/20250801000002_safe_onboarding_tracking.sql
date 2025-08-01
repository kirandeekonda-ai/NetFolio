-- Migration: Add onboarding tracking fields to user_preferences (simplified)
-- Date: 2025-08-01
-- Description: Add onboarding tracking fields safely with proper error handling

-- First, ensure user_preferences table exists (it should from earlier migrations)
-- Add onboarding tracking columns safely
DO $$
BEGIN
    -- Add onboarded column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'onboarded'
    ) THEN
        ALTER TABLE user_preferences ADD COLUMN onboarded BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add onboarded_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'onboarded_at'
    ) THEN
        ALTER TABLE user_preferences ADD COLUMN onboarded_at TIMESTAMPTZ;
    END IF;

    -- Add quick_start_completed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'quick_start_completed'
    ) THEN
        ALTER TABLE user_preferences ADD COLUMN quick_start_completed BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add quick_start_completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' 
        AND column_name = 'quick_start_completed_at'
    ) THEN
        ALTER TABLE user_preferences ADD COLUMN quick_start_completed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN user_preferences.onboarded IS 'Tracks if user has completed the initial onboarding flow';
COMMENT ON COLUMN user_preferences.onboarded_at IS 'Timestamp when user completed onboarding';
COMMENT ON COLUMN user_preferences.quick_start_completed IS 'Tracks if user has completed the quick-start setup';
COMMENT ON COLUMN user_preferences.quick_start_completed_at IS 'Timestamp when user completed quick-start setup';

-- Create index for faster queries on onboarding status (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarded ON user_preferences(user_id, onboarded);
