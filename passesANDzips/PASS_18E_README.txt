DRAGON WRITER AGREEMENT PREVIEW PASS 18E

FIX:
- Rebuilds preview mode directly on top of the polished PASS 18C agreement reader.
- Keeps the 18C writer-studio stylesheet and contained scroll-reader layout.
- ?preview=1 bypasses the already-accepted redirect without changing the stored acceptance.
- Preview still uses the same agreement UI, scroll-to-review behavior, spacing, and visual treatment as the live contributor flow.

INSTALL:
Merge src/ into the current DragonsRitual project, replacing matching files.

DEMO URL:
http://localhost:4321/contributor-agreement/?preview=1

No database changes.
