-- =========================================================
-- PASS 34 — DRAGON TV LIVE BROADCAST BOARD
-- =========================================================

create table if not exists public.dr_tv_live_broadcasts (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'DRAGON LIVE',
  stream_url text,
  poster_url text,
  visibility text not null default 'public'
    check (visibility in ('public','followers','members','private')),
  status text not null default 'scheduled'
    check (status in ('scheduled','live','ended','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dr_tv_live_now_idx
on public.dr_tv_live_broadcasts(status,starts_at,ends_at,priority desc);

alter table public.dr_tv_live_broadcasts enable row level security;

drop policy if exists "public read live broadcasts" on public.dr_tv_live_broadcasts;
create policy "public read live broadcasts"
on public.dr_tv_live_broadcasts for select
using (
  status='live'
  and visibility='public'
  and starts_at<=now()
  and (ends_at is null or ends_at>now())
  and (
    creator_user_id is null
    or exists(
      select 1 from public.dr_creator_channels c
      where c.user_id=creator_user_id
        and c.is_approved=true
        and c.is_active=true
    )
  )
);

-- Admin scheduling helper. Creator self-service broadcasting comes later.
create or replace function public.dr_admin_set_live_broadcast(
  broadcast_id uuid,
  target_creator uuid,
  new_title text,
  new_description text,
  new_category text,
  new_stream_url text,
  new_starts_at timestamptz,
  new_ends_at timestamptz,
  new_status text,
  new_priority integer default 0
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  bid uuid;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;

  if new_status not in ('scheduled','live','ended','cancelled') then
    raise exception 'invalid broadcast status';
  end if;

  if target_creator is not null and not exists(
    select 1 from public.dr_creator_channels
    where user_id=target_creator and is_approved=true and is_active=true
  ) then
    raise exception 'creator channel is not approved';
  end if;

  bid:=coalesce(broadcast_id,gen_random_uuid());

  insert into public.dr_tv_live_broadcasts(
    id,creator_user_id,title,description,category,stream_url,
    starts_at,ends_at,status,priority,updated_at
  )
  values(
    bid,target_creator,left(new_title,180),left(coalesce(new_description,''),2000),
    left(coalesce(new_category,'DRAGON LIVE'),100),new_stream_url,
    new_starts_at,new_ends_at,new_status,new_priority,now()
  )
  on conflict(id) do update set
    creator_user_id=excluded.creator_user_id,
    title=excluded.title,
    description=excluded.description,
    category=excluded.category,
    stream_url=excluded.stream_url,
    starts_at=excluded.starts_at,
    ends_at=excluded.ends_at,
    status=excluded.status,
    priority=excluded.priority,
    updated_at=now();

  return bid;
end;
$$;

revoke all on function public.dr_admin_set_live_broadcast(uuid,uuid,text,text,text,text,timestamptz,timestamptz,text,integer) from public;
grant execute on function public.dr_admin_set_live_broadcast(uuid,uuid,text,text,text,text,timestamptz,timestamptz,text,integer) to authenticated;
