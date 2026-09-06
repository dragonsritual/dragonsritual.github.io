$ErrorActionPreference = 'Stop'

if (-not (Test-Path '.git')) {
  throw 'Run this from the dragonsritual.github.io project root.'
}
if (-not (Test-Path 'src\pages\writer-room.astro')) {
  throw 'writer-room.astro was not found.'
}

$sourceRoot = '.\DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18'
if (-not (Test-Path "$sourceRoot\files\src\pages\contributor-agreement.astro")) {
  throw 'PASS 18 folder is missing. Keep DRAGON_CONTRIBUTOR_AGREEMENT_PASS_18 in the project root.'
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = ".migration-backups\contributor-agreement-18A-$stamp"
New-Item -ItemType Directory -Force -Path "$backup\src\pages" | Out-Null
New-Item -ItemType Directory -Force -Path "$backup\src\styles" | Out-Null

Copy-Item 'src\pages\writer-room.astro' "$backup\src\pages\writer-room.astro" -Force
if (Test-Path 'src\styles\writer-studio.css') {
  Copy-Item 'src\styles\writer-studio.css' "$backup\src\styles\writer-studio.css" -Force
}

Copy-Item "$sourceRoot\files\src\pages\contributor-agreement.astro" 'src\pages\contributor-agreement.astro' -Force

if (-not (Test-Path 'src\styles\writer-studio.css')) {
  New-Item -ItemType File -Force -Path 'src\styles\writer-studio.css' | Out-Null
}

$cssMarker = 'DRAGON CONTRIBUTOR AGREEMENT'
$currentCss = Get-Content 'src\styles\writer-studio.css' -Raw
if ($currentCss -notmatch [regex]::Escape($cssMarker)) {
  Get-Content "$sourceRoot\files\src\styles\contributor-agreement.css" -Raw |
    Add-Content 'src\styles\writer-studio.css' -Encoding UTF8
}

$writerPath = 'src\pages\writer-room.astro'
$writer = Get-Content $writerPath -Raw

if ($writer -notmatch 'contributor_agreement_version') {
  $anchor = 'const user=session?.user;'
  if (-not $writer.Contains($anchor)) {
    throw "Could not find the Writer Room auth anchor. Original file is backed up at $backup."
  }

  $gate = @'
const user=session?.user;
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
'@

  $writer = $writer.Replace($anchor, $gate)
  Set-Content $writerPath $writer -Encoding UTF8
}

Write-Host ''
Write-Host 'CONTRIBUTOR AGREEMENT PASS 18A INSTALLED.' -ForegroundColor Green
Write-Host ''
Write-Host 'NEXT: run the PASS 18 SQL file in Supabase.' -ForegroundColor Yellow
Write-Host 'Then run: npm run build' -ForegroundColor Cyan
Write-Host 'Then run: npm run dev' -ForegroundColor Cyan
