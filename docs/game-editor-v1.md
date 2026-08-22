# DragonsRitual Game Editor v1.0

Route:

`/admin/games/`

Capabilities:

- authenticated owner-only access
- list live PostgreSQL game records
- select and edit an existing game
- create a new game
- title
- slug
- platform
- status
- hours played
- progress
- session count
- last-played date
- current objective/result
- developer
- publisher
- release date
- started-playing date
- summary

Security:

- Supabase Auth validates the session
- `admin_users` validates owner/admin membership
- RLS requires `public.is_admin()` for INSERT/UPDATE
- no DELETE permission is enabled in v1.0

Next:

Session Editor v1.1.