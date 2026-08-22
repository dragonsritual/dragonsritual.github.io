# Supabase

Database schema changes belong in `supabase/migrations`.

Rules:
- migrations are source controlled
- never edit production schema manually without recording the migration
- public browser access uses RLS
- never expose a service-role key in Astro client code