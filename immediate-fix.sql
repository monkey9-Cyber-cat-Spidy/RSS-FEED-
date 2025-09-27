-- IMMEDIATE FIX: Create the missing user profile
-- Copy and paste this into your Supabase SQL Editor and run it

INSERT INTO user_profiles (id, email, username, display_name, role)
SELECT 
  u.id,
  u.email,
  'mk1343093',
  'Manikanta',
  'admin'
FROM auth.users u
WHERE u.email = 'mk1343093@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.id = u.id);

-- Verify it worked
SELECT 'Profile created successfully!' as message, * 
FROM user_profiles 
WHERE email = 'mk1343093@gmail.com';