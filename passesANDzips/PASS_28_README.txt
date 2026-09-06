DRAGONSRITUAL — PASS 28
DRAGON DAILY + DRAGON BOOKS FOUNDATION

THIS PASS FIXES THE ACTUAL HEADER FILE.
No PowerShell text replacement is required.

HEADER
TODAY -> DAILY
Adds BOOKS to public navigation.
Keeps TV and RADIO.
The user-provided LaunchHeader.astro was used as the exact basis.

NEW /books/
A professional visual foundation for:
- Dragon Book Club
- horizontal book-cover shelves / carousels
- established fantasy shelf
- permanent independent-author shelf
- future used-book exchange
- future member book marketplace
- Book Club forum / discussion-room presentation
- mobile layouts

IMPORTANT: NO FAKE FUNCTIONALITY
The used-book checkout, seller marketplace, subscriptions, and forum posting are NOT falsely wired up.
Those need real Supabase/payment/community systems before public activation.

FUTURE DRAGON TV / CREATOR SUBSCRIPTIONS
The architecture direction is preserved:
- viewers can eventually subscribe to Dragon TV creators/streamers
- writers and other creators can eventually create subscriber communities
- creator subscriptions should be a shared platform capability, not TV-only
This pass does not invent billing before the payment/entitlement architecture is designed.

INSTALL
Copy the contents of this ZIP into the current repository root, preserving folders.
Then:
npm run dev

CHECK
/
  header says DAILY, not TODAY
/books/
  book club page loads
  BOOKS nav is active
mobile:
  horizontal shelves remain touch-scrollable

NO NEW SQL IN THIS PASS.
PASS 25/26 security/member SQL remains unchanged.
