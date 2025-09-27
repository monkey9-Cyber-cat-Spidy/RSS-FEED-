-- QUICK ADMIN FIX for mk1343093@gmail.com
-- Copy and paste this entire block into Supabase SQL Editor and run it

-- This will either create the profile or update the existing one to admin
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'mk1343093@gmail.com';
    
    IF user_uuid IS NOT NULL THEN
        -- Try to insert the profile (will do nothing if exists)
        INSERT INTO user_profiles (id, email, username, display_name, role)
        VALUES (
            user_uuid,
            'mk1343093@gmail.com',
            'mk1343093',
            'Manikanta',
            'admin'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Force update to admin role
        UPDATE user_profiles 
        SET role = 'admin', updated_at = NOW()
        WHERE id = user_uuid;
        
        RAISE NOTICE 'Admin role set for mk1343093@gmail.com with ID: %', user_uuid;
    ELSE
        RAISE NOTICE 'User mk1343093@gmail.com not found in auth.users';
    END IF;
END $$;

-- Verify it worked
SELECT 
    'SUCCESS CHECK' as status,
    email,
    role,
    updated_at
FROM user_profiles 
WHERE email = 'mk1343093@gmail.com';