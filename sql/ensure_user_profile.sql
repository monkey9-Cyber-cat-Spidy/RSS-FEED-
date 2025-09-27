-- SECURITY DEFINER function to ensure a user_profiles row exists for the current auth user
-- Run this in Supabase SQL Editor

create or replace function ensure_user_profile()
returns user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  result user_profiles;
begin
  select id, email, raw_user_meta_data
    into u
  from auth.users
  where id = auth.uid();

  if u.id is null then
    raise exception 'No authenticated user';
  end if;

  -- Insert or update the user profile for this user
  insert into user_profiles (id, email, username, display_name)
  values (
    u.id,
    coalesce(u.email, ''),
    coalesce(u.raw_user_meta_data->>'username', split_part(coalesce(u.email, 'user@local'), '@', 1)),
    coalesce(u.raw_user_meta_data->>'display_name', split_part(coalesce(u.email, 'user@local'), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    username = excluded.username,
    display_name = excluded.display_name,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

-- Allow authenticated users to call it
grant execute on function ensure_user_profile() to anon, authenticated;