# DragonsRitual

Modular DragonsRitual studio website.

## Current function
Gaming / Streaming dashboard v0.1

## Local development
PowerShell:

    .\dev.ps1

## Deploy
PowerShell:

    .\deploy.ps1

## Architecture
- `src/modules/` = site functions/pages
- `src/components/` = reusable UI
- `src/services/` = data/backend boundary
- `src/data/` = temporary local structured data
- `public/` = static assets + CNAME

The gaming UI does not import data directly. It talks to `gamingService.js`, which is intentionally designed so a real backend can replace local data later without rebuilding the UI.
