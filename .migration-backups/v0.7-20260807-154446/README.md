# DragonsRitual Network

Astro-based modular DragonsRitual platform.

## Current public function

Gaming / Streaming.

## Architecture status

### v0.4
Astro frontend foundation.

### v0.5
Professional data/domain foundation:
- typed domain entities
- runtime schema validation
- relationship validation
- storage-independent data source contract
- local adapter
- gaming dashboard service
- Supabase-ready backend boundary
- Sanity-ready editorial relationship model
- world-location deep-link preparation

## Run

```powershell
npm run dev
```

## Build

```powershell
npm run build
```

## Validate data

```powershell
npm run data:validate
```

## Important rule

UI/pages should not directly depend on Supabase, Sanity, or temporary
seed files. They should consume application services so backend systems
can change independently.