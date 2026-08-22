# DragonsRitual Project Architecture

## Primary rule

Every major function is a module/system.

The UI should not directly own database logic.

## Layers

### Astro
Presentation, routes, layouts, SEO.

### Services
Application-facing logic.

### Supabase / PostgreSQL
Structured relational data:
- games
- sessions
- streams
- schedules
- world locations
- profiles
- rewards
- live channels

### Sanity
Editorial publishing:
- article body
- drafts
- structured editorial blocks
- newsroom workflow

### Future 3D Runtime
Three.js / WebGPU / desktop wrapper.

## Public site scope

Only Gaming is currently public.

Future navigation items are added only after their corresponding system is intentionally built.