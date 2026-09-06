$ErrorActionPreference = "Stop"

if(-not (Test-Path ".git") -or -not (Test-Path "src\pages\writer-room.astro")){
  throw "Run this from the dragonsritual.github.io project root after PASS 17B."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = ".migration-backups\contributor-agreement-18-$stamp"
New-Item -ItemType Directory -Force -Path "$backup\src\pages" | Out-Null
New-Item -ItemType Directory -Force -Path "$backup\src\styles" | Out-Null

Copy-Item "src\pages\writer-room.astro" "$backup\src\pages\writer-room.astro" -Force
if(Test-Path "src\styles\writer-studio.css"){
  Copy-Item "src\styles\writer-studio.css" "$backup\src\styles\writer-studio.css" -Force
}

Copy-Item ".\DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18\files\src\pages\contributor-agreement.astro" "src\pages\contributor-agreement.astro" -Force

if(-not(Test-Path "src\styles\writer-studio.css")){
  New-Item -ItemType File -Force -Path "src\styles\writer-studio.css" | Out-Null
}

$css = Get-Content "src\styles\writer-studio.css" -Raw
$marker = "/* DRAGON CONTRIBUTOR AGREEMENT — PASS 18 */"
if($css -notmatch [regex]::Escape($marker)){
  Get-Content ".\DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18\files\src\styles\contributor-agreement.css" -Raw |
    Add-Content "src\styles\writer-studio.css" -Encoding UTF8
}

# Ensure the agreement page receives the Writer Studio stylesheet through SiteLayout/global imports.
# Also add a hard gate at Writer Room boot.
$wr = Get-Content "src\pages\writer-room.astro" -Raw
$needle = "const supabase=getSupabaseBrowserClient(); const {data:{session}}=await supabase.auth.getSession(); if(!session)location.href='/join/'; const user=session?.user;"
$replacement = @"
const supabase=getSupabaseBrowserClient(); const {data:{session}}=await supabase.auth.getSession(); if(!session)location.href='/join/'; const user=session?.user;
if(user){
  const {data:agreementProfile,error:agreementError}=await supabase
    .from('dr_creator_profiles')
    .select('contributor_agreement_version,contributor_agreement_accepted_at')
    .eq('user_id',user.id)
    .maybeSingle();
  if(agreementError || agreementProfile?.contributor_agreement_version!=='1.0' || !agreementProfile?.contributor_agreement_accepted_at){
    location.href='/contributor-agreement/';
    throw new Error('Contributor agreement required');
  }
}
"@

if($wr.Contains($needle)){
  $wr = $wr.Replace($needle,$replacement)
  Set-Content "src\pages\writer-room.astro" $wr -Encoding UTF8
} elseif($wr -notmatch "contributor_agreement_version"){
  throw "PASS 18 could not find the expected Writer Room auth line. No files were overwritten beyond the new agreement page/CSS. Restore from $backup if needed."
}

Write-Host ""
Write-Host "CONTRIBUTOR AGREEMENT PASS 18 INSTALLED." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Yellow
Write-Host "Run supabase\CONTRIBUTOR_AGREEMENT_PASS_18.sql in Supabase SQL Editor." -ForegroundColor Yellow
Write-Host ""
Write-Host "Then:" -ForegroundColor Cyan
Write-Host "npm run build" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan
