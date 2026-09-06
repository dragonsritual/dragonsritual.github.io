DRAGON WRITER AUTH FIX — PASS 16.1

WHY
Supabase recovery links were landing on the site root because there was no dedicated reset-password route.

ADDS
- /reset-password/
- Recovery-token handling
- New-password + confirm-password form
- Supabase updateUser({ password })
- Redirect to Writer Room after successful password reset
- FORGOT PASSWORD button on /join/
- Explicit redirectTo /reset-password/

IMPORTANT SECURITY NOTE
Do NOT reuse a recovery URL that has been pasted/shared anywhere.
Generate a fresh recovery email after installing this pass.

RUN
Set-ExecutionPolicy -Scope Process Bypass
.\DRAGON_WRITER_AUTH_FIX_PASS_16_1\APPLY_WRITER_AUTH_FIX_PASS_16_1.ps1
npm run build
npm run dev

TEST
1. Go to http://localhost:4321/join/
2. Enter your email under SIGN IN.
3. Click FORGOT PASSWORD.
4. Open the NEW recovery email.
5. It should land at http://localhost:4321/reset-password/
6. Choose a new password.
7. It should enter /writer-room/
