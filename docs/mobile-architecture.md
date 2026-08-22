# DragonsRitual Mobile Architecture

The mobile experience is not a separate copy of the website.

## Surfaces

One account can eventually move among:

- responsive browser
- installed PWA
- Android app
- iOS app
- desktop app
- browser 3D world
- downloadable 3D game

All surfaces consume shared backend services.

## Immediate v0.7 capability

The Astro site is now PWA-ready:

- web app manifest
- installable icons
- standalone display mode
- safe-area handling for modern phones
- conservative offline shell
- device-capability service
- continuity event contract

No rewards or tracking are active yet.

## Future handoff

A signed-in player can move from desktop to phone without losing context.

Example:

Desktop:
Watching/playing Session 42 at Founders Valley Forge.

Phone:
Opens DragonsRitual and receives a "Continue Session 42" surface.

Later the reverse handoff can return the player to desktop.

## Mobile-only experiences

Good candidates:

- companion inventory
- market/watchlist
- live world-event alerts
- map
- character/status screen
- stream continuation
- voting
- timed community events
- camera/photo upload
- second-screen controls
- verified mobile reward claims

## Reward security

Never award meaningful rewards based only on CSS viewport or user-agent.

Browser signals are trivial to spoof.

For valuable/exclusive rewards:
- user must be authenticated
- server validates eligibility
- official Android/iOS apps can later add stronger app/device attestation
- server writes the reward claim

## Official app path

Phase 1: responsive Astro web app
Phase 2: installable PWA
Phase 3: Capacitor-based Android/iOS app using the same web UI where sensible
Phase 4: platform-specific native features when they actually add value