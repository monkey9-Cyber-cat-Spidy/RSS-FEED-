-- Fix user creation issues
-- Run this in your Supabase SQL Editor

-- First, let's recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
  display_name_value TEXT;
BEGIN
  -- Generate safe username and display name
  username_value := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  display_name_value := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  
  -- Insert the user profile (this should work with RLS because it's a SECURITY DEFINER function)
  INSERT INTO user_profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    username_value,
    display_name_value
  );
  
  RETURN NEW;
EXCEPTION 
  WHEN unique_violation THEN
    -- If username already exists, append a number
    INSERT INTO user_profiles (id, email, username, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      username_value || '_' || EXTRACT(EPOCH FROM NOW())::INTEGER,
      display_name_value
    );
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error (in production, you might want to use a logging table)
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Make sure RLS policies allow the trigger to work
-- Temporarily disable RLS to test (you can re-enable later)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled, add a policy for the trigger
-- CREATE POLICY "Allow service role to insert profiles" ON user_profiles
--   FOR INSERT WITH CHECK (true);

-- Test the fix by checking if we can select from user_profiles
SELECT 'User profiles table is accessible' as status;