-- DragonsRitual v1.2
-- Live schedule + safe session-driven aggregate statistics.

alter table public.games
add column if not exists session_stats_enabled boolean not null default false;

grant update (session_stats_enabled) on public.games to authenticated;

-- Internal recalculation function.
-- It only changes a game when that game's session_stats_enabled flag is true.
create or replace function public.recalculate_game_stats_internal(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  enabled boolean;
  completed_count integer;
  total_hours numeric(10,2);
  latest_progress numeric(5,2);
  latest_played date;
begin
  select session_stats_enabled
  into enabled
  from public.games
  where id = p_game_id;

  if coalesce(enabled, false) = false then
    return;
  end if;

  select
    count(*) filter (where status = 'completed'),
    coalesce(
      round(
        (sum(duration_minutes) filter (where status = 'completed'))::numeric / 60.0,
        2
      ),
      0
    ),
    (
      select s.progress_after
      from public.sessions s
      where s.game_id = p_game_id
        and s.status = 'completed'
        and s.progress_after is not null
      order by coalesce(s.ended_at, s.started_at, s.created_at) desc
      limit 1
    ),
    (
      select coalesce(s.started_at, s.ended_at)::date
      from public.sessions s
      where s.game_id = p_game_id
        and s.status = 'completed'
        and (s.started_at is not null or s.ended_at is not null)
      order by coalesce(s.ended_at, s.started_at, s.created_at) desc
      limit 1
    )
  into completed_count, total_hours, latest_progress, latest_played
  from public.sessions
  where game_id = p_game_id;

  update public.games
  set
    session_count = coalesce(completed_count, 0),
    hours_played = coalesce(total_hours, 0),
    progress_percent = coalesce(latest_progress, progress_percent),
    last_played_at = coalesce(latest_played, last_played_at)
  where id = p_game_id;
end;
$$;

revoke all on function public.recalculate_game_stats_internal(uuid) from public;

-- Admin-facing RPC.
create or replace function public.recalculate_game_stats(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  perform public.recalculate_game_stats_internal(p_game_id);
end;
$$;

revoke all on function public.recalculate_game_stats(uuid) from public;
grant execute on function public.recalculate_game_stats(uuid) to authenticated;

-- Trigger keeps enabled games synchronized after session changes.
create or replace function public.sync_game_stats_from_session_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_game_stats_internal(old.game_id);
    return old;
  end if;

  perform public.recalculate_game_stats_internal(new.game_id);

  if tg_op = 'UPDATE' and old.game_id is distinct from new.game_id then
    perform public.recalculate_game_stats_internal(old.game_id);
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_sync_game_stats on public.sessions;

create trigger sessions_sync_game_stats
after insert or update or delete on public.sessions
for each row
execute function public.sync_game_stats_from_session_change();

-- Existing games stay OFF by default.
-- This protects historical totals until the owner decides a game's session
-- history is complete enough to become authoritative.