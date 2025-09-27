-- Backfill user_profiles for any existing auth.users that are missing a profile
-- Run this once in Supabase SQL Editor

insert into user_profiles (id, email, username, display_name)
select 
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'username', split_part(coalesce(u.email, 'user@local'), '@', 1)),
  coalesce(u.raw_user_meta_data->>'display_name', split_part(coalesce(u.email, 'user@local'), '@', 1))
from auth.users u
where not exists (
  select 1 from user_profiles p where p.id = u.id
);

-- Optional: make admin by email example
-- update user_profiles set role = 'admin' where email = 'your-admin@example.com';
