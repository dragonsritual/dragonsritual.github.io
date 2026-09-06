$ErrorActionPreference = "Stop"

npm install
npm run build

git add .
git status

$message = Read-Host "Commit message"

if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "DragonsRitual Astro update"
}

git commit -m $message
git push origin main

Write-Host ""
Write-Host "Pushed to GitHub. GitHub Actions will build and deploy the Astro site." -ForegroundColor Green