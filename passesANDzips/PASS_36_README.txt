DRAGONSRITUAL — PASS 36
WIZARD FEEDER / SITE GAME INTEGRATION FOUNDATION

WHAT THIS PASS DOES NOW

1. Adds GAMING to the main public navigation.

2. Adds /gaming/
A Dragon Gaming hub with:
- Wizard Feeder
- Dragon Arcade foundation
- Dragon League foundation

3. Adds /gaming/wizard-feeder/
This is the browser game room.

It automatically checks for:
public/games/wizard-feeder/index.html

If that file exists, it loads the game inside the Dragon page.
If it does not exist yet, the page clearly says the room is ready and waits for the real game files.

WHY
We do not yet know whether the hard-drive Wizard Feeder project is:
- HTML/JavaScript/browser-native
- Electron
- Python/Tkinter/Pygame
- Unity
- another desktop framework

If it is already web-native, we can mount it almost immediately.
If it is desktop-only, we port the game logic/UI to a browser build instead of pretending the executable can run on a website.

4. SITE-WIDE WIZARD BUTTON FOUNDATION
LaunchHeader now contains a small Wizard activity element.

It is HIDDEN for people who have never created a wizard.

Once the game stores:
dragon:wizard:character

the button appears in the header.

When the game stores an active alert:
dragon:wizard:alert

the button does the shake / settle / shake interval behavior.

This is deliberately subtle rather than a permanent noisy game notification.

5. GAME -> SITE MESSAGE BRIDGE
The embedded game can tell the surrounding DragonsRitual site:

DRAGON_WIZARD_STATE
- character name
- level

DRAGON_WIZARD_ALERT
- hungry
- returned from exploration
- loot found
- training complete
- etc.

DRAGON_WIZARD_CLEAR_ALERT

This means the browser port can integrate with the site without coupling every game system directly into the header.

WHAT WE SHOULD ADD AFTER THE REAL GAME FILES ARRIVE

PHASE A — PLAYABLE
- identify engine/framework
- make browser build
- save/load
- mobile controls/layout
- embed into /gaming/wizard-feeder/

PHASE B — MEMBER PERSISTENCE
Move character ownership server-side:
- character
- stats
- level / XP
- mood / hunger / energy
- tower progress
- inventory / equipment
- timestamps / activity

PHASE C — PUBLIC MEMBER PROFILE
Optional public card:
- Wizard level
- class/aspect
- equipped weapon/armor
- achievements
- current activity
- "playing Wizard Feeder"

PHASE D — SOCIAL
- leaderboards
- forum identity
- inspect another member's wizard
- achievements
- gifts

PHASE E — ECONOMY / TRADING
ONLY after server-authoritative inventory exists:
- unique item IDs
- ownership
- trade offers
- accept/reject
- transaction ledger
- anti-duplication checks
- member-only trade area

DO NOT build item trading with localStorage/client-only ownership.
Anything tradable must be server-authoritative first.

INSTALL
Merge this pass into the current repository.
npm run dev

Check:
/gaming/
/gaming/wizard-feeder/

NO SQL REQUIRED YET.
We wait for the real game files before defining the persistent schema.
