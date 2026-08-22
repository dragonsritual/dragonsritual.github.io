-- DragonsRitual v0.6.1
-- Explicit Data API read grants.
-- RLS policies still control which rows are visible.

grant usage on schema public to anon, authenticated;

grant select on table public.platforms to anon, authenticated;
grant select on table public.games to anon, authenticated;
grant select on table public.streams to anon, authenticated;
grant select on table public.world_locations to anon, authenticated;
grant select on table public.sessions to anon, authenticated;
grant select on table public.tags to anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.game_tags to anon, authenticated;
grant select on table public.game_categories to anon, authenticated;
grant select on table public.session_tags to anon, authenticated;
grant select on table public.media to anon, authenticated;
grant select on table public.article_links to anon, authenticated;

-- Cross-device/public catalog tables from migration 0002.
grant select on table public.reward_definitions to anon, authenticated;
grant select on table public.live_channels to anon, authenticated;
grant select on table public.live_channel_events to anon, authenticated;

-- Authenticated-only personal tables.
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.device_sessions to authenticated;
grant select on table public.reward_claims to authenticated;
