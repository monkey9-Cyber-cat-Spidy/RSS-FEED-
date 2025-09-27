-- Comprehensive troubleshooting for mk1343093@gmail.com admin issue
-- Run this step by step in your Supabase SQL Editor

-- Step 1: Check if user exists in auth.users
SELECT 'AUTH USERS CHECK' as step;
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMED'
        ELSE 'EMAIL NOT CONFIRMED'
    END as email_status
FROM auth.users 
WHERE email = 'mk1343093@gmail.com';

-- Step 2: Check if user profile exists
SELECT 'USER PROFILE CHECK' as step;
SELECT 
    id,
    email,
    username,
    display_name,
    role,
    created_at,
    updated_at
FROM user_profiles 
WHERE email = 'mk1343093@gmail.com';

-- Step 3: Check ALL user profiles (to see what exists)
SELECT 'ALL USER PROFILES' as step;
SELECT 
    email,
    username,
    display_name,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Step 4: If profile doesn't exist, create it with admin role
-- First check if the user exists in auth.users but not in user_profiles
SELECT 'MISSING PROFILE CHECK' as step;
SELECT 
    u.id,
    u.email,
    u.created_at,
    CASE 
        WHEN p.id IS NULL THEN 'PROFILE MISSING - NEEDS TO BE CREATED'
        ELSE 'PROFILE EXISTS'
    END as profile_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'mk1343093@gmail.com';

-- Step 5: CREATE the missing profile (if needed)
-- Run this only if the above shows 'PROFILE MISSING'
INSERT INTO user_profiles (id, email, username, display_name, role)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as username,
    COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)) as display_name,
    'admin' as role
FROM auth.users u
WHERE u.email = 'mk1343093@gmail.com'
    AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);

-- Step 6: FORCE UPDATE to admin (run this regardless)
UPDATE user_profiles 
SET 
    role = 'admin',
    updated_at = NOW()
WHERE email = 'mk1343093@gmail.com';

-- Step 7: Verify the update worked
SELECT 'FINAL VERIFICATION' as step;
SELECT 
    email,
    username,
    display_name,
    role,
    created_at,
    updated_at,
    CASE 
        WHEN role = 'admin' THEN '✅ ADMIN ROLE SET CORRECTLY'
        ELSE '❌ ADMIN ROLE NOT SET'
    END as admin_status
FROM user_profiles 
WHERE email = 'mk1343093@gmail.com';