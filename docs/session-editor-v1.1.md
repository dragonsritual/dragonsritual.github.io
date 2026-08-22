# DragonsRitual Session Editor v1.1

Route:

`/admin/sessions/`

Capabilities:

- owner-authenticated access
- list live PostgreSQL session records
- filter sessions by game
- create a session
- edit a session
- scheduled/live/completed/cancelled status
- scheduled date/time
- start and end time
- calculate duration
- progress before/after
- result
- notes
- link a Twitch/stream record
- automatic session title suggestion
- automatic next sequence suggestion

Security:

- Supabase Auth session required
- `admin_users` membership required
- RLS requires `public.is_admin()` for session INSERT/UPDATE
- no DELETE permission in v1.1

Important architecture note:

v1.1 intentionally does not automatically rewrite aggregate game hours,
progress, or session_count. That will be introduced only after historical
session records are ready, to avoid corrupting existing season totals.