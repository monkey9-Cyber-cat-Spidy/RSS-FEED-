-- Fix missing user profile for mk1343093@gmail.com
-- Run this in your Supabase SQL Editor

-- First, let's check what users exist in auth.users but not in user_profiles
SELECT 
  u.id,
  u.email,
  u.created_at,
  CASE 
    WHEN p.id IS NULL THEN 'Missing Profile'
    ELSE 'Profile Exists'
  END as profile_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'mk1343093@gmail.com';

-- Insert the missing profile for mk1343093@gmail.com
-- You'll need to get the actual user ID from the above query
-- Replace 'USER_ID_HERE' with the actual UUID from the query above

INSERT INTO user_profiles (id, email, username, display_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as username,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) as display_name,
  'admin' -- Make them admin so they can post articles
FROM auth.users u
WHERE u.email = 'mk1343093@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);

-- Verify the user was created
SELECT * FROM user_profiles WHERE email = 'mk1343093@gmail.com';