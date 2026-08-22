-- DragonsRitual v1.0.1
-- Fix authenticated reads for admin/editor sessions.
--
-- The original public policies were created for `anon`.
-- Once the owner signs in, requests use the `authenticated` role.
-- Table GRANTs alone are not enough when RLS is enabled.
-- These policies allow authenticated sessions to read the same
-- public catalog data while write operations remain admin-only.

drop policy if exists "authenticated read platforms" on public.platforms;
create policy "authenticated read platforms"
on public.platforms
for select
to authenticated
using (true);

drop policy if exists "authenticated read games" on public.games;
create policy "authenticated read games"
on public.games
for select
to authenticated
using (true);

drop policy if exists "authenticated read streams" on public.streams;
create policy "authenticated read streams"
on public.streams
for select
to authenticated
using (true);

drop policy if exists "authenticated read world locations" on public.world_locations;
create policy "authenticated read world locations"
on public.world_locations
for select
to authenticated
using (true);

drop policy if exists "authenticated read sessions" on public.sessions;
create policy "authenticated read sessions"
on public.sessions
for select
to authenticated
using (true);

drop policy if exists "authenticated read tags" on public.tags;
create policy "authenticated read tags"
on public.tags
for select
to authenticated
using (true);

drop policy if exists "authenticated read categories" on public.categories;
create policy "authenticated read categories"
on public.categories
for select
to authenticated
using (true);

drop policy if exists "authenticated read game tags" on public.game_tags;
create policy "authenticated read game tags"
on public.game_tags
for select
to authenticated
using (true);

drop policy if exists "authenticated read game categories" on public.game_categories;
create policy "authenticated read game categories"
on public.game_categories
for select
to authenticated
using (true);

drop policy if exists "authenticated read session tags" on public.session_tags;
create policy "authenticated read session tags"
on public.session_tags
for select
to authenticated
using (true);

drop policy if exists "authenticated read media" on public.media;
create policy "authenticated read media"
on public.media
for select
to authenticated
using (true);

drop policy if exists "authenticated read article links" on public.article_links;
create policy "authenticated read article links"
on public.article_links
for select
to authenticated
using (true);

-- Sanity check. This returns the three existing game records when run
-- in SQL Editor; the browser editor will see them after this migration.
select
  title,
  status,
  hours_played,
  progress_percent,
  session_count
from public.games
order by title;