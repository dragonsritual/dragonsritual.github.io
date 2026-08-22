# DragonsRitual Data Architecture v0.5

The public interface is intentionally separated from storage.

## Core entities

- Platform
- Game
- Session
- Stream
- Article
- Author
- Tag
- Category
- Media
- WorldLocation

## Primary relationship chain

Game
→ Session
→ Stream
→ Article
→ Media
→ WorldLocation

A session may connect to a Twitch stream, article/recap, screenshots,
and eventually an exact location inside a DragonsRitual game world.

## Storage boundaries

### Supabase / PostgreSQL
Planned source of truth for:
- games
- platforms
- sessions
- schedules
- streams
- statistics
- world locations
- relational identifiers

### Sanity
Planned editorial source of truth for:
- article body
- editorial workflow
- drafts
- rich media composition
- newsroom publishing

Articles will retain relational IDs that connect editorial records to
games/sessions in PostgreSQL.

### Astro
Presentation and routing layer.

Astro pages should call the service layer rather than importing database
clients directly.

## Adapters

`src/data/dataSource.ts` defines the application data contract.

Current:
- `localDataSource`

Future:
- `supabaseDataSource`

Changing the backing store should not require rewriting page components.

## Deep-link future

`WorldLocation.deepLink` is reserved for links such as:

`/realms/play?location=founders-valley-forge`

This creates a future bridge between articles, sessions, the website,
and the playable 3D world.