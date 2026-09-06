# The Ninth Spire ↔ DragonsRitual Integration

## What PASS 40A does now
- Installs the actual Pass 50 browser game under `/public/games/ninth-spire/`.
- Adds a real `/gaming/ninth-spire/` website route.
- Converts the old `/gaming/wizard-feeder/` route into a redirect.
- Updates the Gaming hub from Wizard Feeder to The Ninth Spire.
- Adds a same-origin browser bridge from the game to the website.
- Persists a safe local character summary for the website shell.
- Adds a reusable `NinthSpireProfileCard.astro` for the member-profile integration pass.
- Keeps game state local/non-competitive until the server backend is connected.

## Architecture going forward
`DragonsRitual Account`
→ `Member Profile`
→ `Character Registry`
→ `Ninth Spire Character`
→ future DragonsRitual games/worlds

The game should NOT create a separate account system.

## Next server pass
Supabase should become authoritative for:
- account/member ID
- character ownership
- character name reservation
- public character card
- level/XP used competitively
- inventory/item ownership
- books/relics/recipes/titles/badges
- realm + league records
- trades
- prize eligibility / product keys / redemption

The browser remains a rendering/input client.

## Profile integration next
Place `<NinthSpireProfileCard />` into the current member profile page, then expand it into:
- full collectible profile-card layout
- element-reactive profile skin
- title cards
- books discovered + favorite book
- relic showcase
- recipes
- trading cards
- tastes
- worlds visited
- badges
- Chronicle highlights
- friends/groups/guild later

## Important
The current bridge intentionally stores only a *display snapshot* in localStorage.
That is not the eventual authoritative member/game database.
