DRAGONSRITUAL — PASS 27
DAILY BRAND PASS

CHANGE
- Public top navigation: TODAY -> DAILY (patched in LaunchHeader.astro by APPLY_PASS_27.ps1)
- Home page browser title: Daily — DragonsRitual
- Home transmissions eyebrow: TODAY -> DAILY
- Join page return label: RETURN TO DAILY

INTENTION
The DRAGON masthead supplies the parent brand, so DAILY reads naturally as DRAGON DAILY alongside DRAGON TV and DRAGON RADIO.

SAFE INTERNALS
- Existing CSS classes and JavaScript IDs named today-* remain unchanged to avoid needless regressions.
- Analytics range value "today" remains unchanged because it means the actual current-day time range, not the public brand label.
- Editorial database placement values are unchanged in this small branding pass to preserve compatibility.

APPLY
From your project root in PowerShell, extract this ZIP to a temporary folder and run its APPLY_PASS_27.ps1, OR copy the included src/page files and change the LaunchHeader public label from TODAY to DAILY.

Then:
npm run dev

Verify:
1. Header reads DAILY / TV / RADIO.
2. Home page reads DAILY above TRANSMISSIONS.
3. Join page says RETURN TO DAILY.
4. Member/admin security from Pass 26 is untouched.
