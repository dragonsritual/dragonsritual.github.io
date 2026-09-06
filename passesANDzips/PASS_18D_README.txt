DRAGON WRITER AGREEMENT PREVIEW — PASS 18D

Changed:
- src/pages/contributor-agreement.astro

Adds owner/demo preview URL:
http://localhost:4321/contributor-agreement/?preview=1

Preview mode:
- Does not redirect an already-accepted account away from the agreement.
- Does not overwrite/re-record the agreement acceptance.
- Shows the agreement using the currently signed-in identity.
- The action button returns to /writer-room/.

Normal /contributor-agreement/ behavior is unchanged.
