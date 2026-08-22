-- Run this ONLY after you create your owner user in Supabase Auth.
--
-- Replace YOUR_OWNER_EMAIL@example.com with your actual Supabase Auth email.
-- Then run this query in the Supabase SQL Editor.
--
-- Do not commit a modified copy containing a private email if you do not
-- want that email stored in Git history.

insert into public.admin_users (user_id)
select id
from auth.users
where email = 'dragonsritual@proton.me'
on conflict (user_id) do nothing;

select
  au.user_id,
  u.email,
  au.created_at
from public.admin_users au
join auth.users u on u.id = au.user_id;