# Admin Feature

The DragonsRitual control room.

v0.8 is intentionally READ-ONLY.

Current purpose:
- verify Supabase connection
- inspect live game records
- show system status
- establish admin navigation and visual language

Next:
- Supabase Auth
- owner/admin access gate
- create/edit games
- create/edit sessions
- schedule streams
- manage media
- connect Sanity newsroom

Important:
No database mutation controls should be enabled before authentication
and authorization are in place.