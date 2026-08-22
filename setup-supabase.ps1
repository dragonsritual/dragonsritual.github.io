$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Connect DragonsRitual to Supabase ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Use the values from Supabase Dashboard -> your project -> Connect." -ForegroundColor Yellow
Write-Host "Use the PUBLIC/PUBLISHABLE key, never a secret/service-role key." -ForegroundColor Yellow
Write-Host ""

$url = Read-Host "Supabase Project URL"
$key = Read-Host "Supabase Publishable Key"

if ([string]::IsNullOrWhiteSpace($url)) {
    throw "Project URL cannot be empty."
}

if ([string]::IsNullOrWhiteSpace($key)) {
    throw "Publishable key cannot be empty."
}

$content = @"
PUBLIC_SUPABASE_URL=$url
PUBLIC_SUPABASE_PUBLISHABLE_KEY=$key
PUBLIC_DR_DATA_PROVIDER=supabase
"@

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) ".env.local"),
    $content,
    $utf8
)

Write-Host ""
Write-Host ".env.local created. It is ignored by Git." -ForegroundColor Green
Write-Host "Restart npm run dev after changing environment variables." -ForegroundColor Cyan