$ErrorActionPreference="Stop"

if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\join.astro") -or -not(Test-Path "src\pages\writer-room.astro")){
  throw "Run this from the dragonsritual.github.io project root after PASS 16."
}

$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\writer-auth-fix-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach($p in @("src\pages\join.astro","src\styles\launch.css")){
  if(Test-Path $p){
    $dest=Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

Copy-Item ".\DRAGON_WRITER_AUTH_FIX_PASS_16_1\files\src\pages\reset-password.astro" "src\pages\reset-password.astro" -Force

$join = Get-Content "src\pages\join.astro" -Raw

if($join -notmatch 'data-forgot-password'){
  $join = $join.Replace(
    '<button class="wr-primary" type="submit" data-submit>ENTER WRITER ROOM</button>',
    '<button class="wr-primary" type="submit" data-submit>ENTER WRITER ROOM</button>' + "`r`n        " +
    '<button class="wr-forgot" type="button" data-forgot-password>FORGOT PASSWORD?</button>'
  )
}

if($join -notmatch 'resetPasswordForEmail'){
  $needle = "form.addEventListener('submit', async (event) => {"
  $insert = @'
      document.querySelector('[data-forgot-password]')?.addEventListener('click', async () => {
        const email = form.email.value.trim();
        if (!email) {
          say('ENTER YOUR EMAIL FIRST.', true);
          return;
        }
        say('SENDING RECOVERY…');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password/`
        });
        if (error) say(error.message, true);
        else say('RECOVERY EMAIL SENT.');
      });

'@
  $join = $join.Replace($needle, $insert + "      " + $needle)
}

Set-Content "src\pages\join.astro" $join -Encoding UTF8

@'

/* WRITER AUTH FIX — PASS 16.1 */
.wr-forgot{
  border:0;
  background:transparent;
  color:#6f7680;
  padding:9px 0 0;
  text-align:left;
  cursor:pointer;
  font:800 6px/1 system-ui,sans-serif;
  letter-spacing:.12em;
}
.wr-forgot:hover{color:#c3b071}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 16.1 INSTALLED." -ForegroundColor Green
Write-Host "Added /reset-password/ and explicit recovery routing." -ForegroundColor Green
Write-Host "Added FORGOT PASSWORD to /join/." -ForegroundColor Green
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
Write-Host "Then send yourself a NEW recovery email." -ForegroundColor Yellow
