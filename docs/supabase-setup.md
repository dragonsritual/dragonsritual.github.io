# DragonsRitual Supabase Setup

## Architecture

Supabase/PostgreSQL owns structured relational data:

- platforms
- games
- sessions
- schedules
- streams
- tags/categories
- media relationships
- world locations
- Sanity article relationship IDs

Sanity will later own rich editorial article content.

## Security

The public Astro site uses only the Supabase Project URL and a
publishable key.

Never put a service-role key, secret key, or database password in
browser code or GitHub.

RLS is enabled by the initial migration. Public visitors receive
SELECT-only access through explicit policies.

## Local configuration

Run:

    .\setup-supabase.ps1

Then restart:

    npm run dev

The `.env.local` file is excluded from Git.

## Database schema

Migration:

    supabase/migrations/202608070001_initial_dragonsritual_schema.sql

This file is the source-controlled schema definition for the project.