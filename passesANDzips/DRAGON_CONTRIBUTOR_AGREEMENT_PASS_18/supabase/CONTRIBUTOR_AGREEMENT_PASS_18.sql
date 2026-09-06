-- DRAGON CONTRIBUTOR AGREEMENT — PASS 18
-- Safe to run after Writer Studio database fixes.
-- Adds agreement acceptance metadata to creator profiles.

begin;

alter table public.dr_creator_profiles
  add column if not exists agreement_legal_name text;

alter table public.dr_creator_profiles
  add column if not exists contributor_agreement_version text;

alter table public.dr_creator_profiles
  add column if not exists contributor_agreement_accepted_at timestamptz;

-- Existing owner/editor can update their own profile through current RLS.
grant select, insert, update
on table public.dr_creator_profiles
to authenticated;

commit;

-- EXPECTED:
-- Success. No rows returned
