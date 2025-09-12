#!/usr/bin/env pwsh
# Simple GitHub Pages deployment script for Quibish

Write-Host "Deploying Quibish to GitHub Pages..." -ForegroundColor Cyan

# Build the production version
Write-Host "Building production version..." -ForegroundColor Blue
npx react-scripts build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

# Switch to gh-pages branch
Write-Host "Switching to gh-pages branch..." -ForegroundColor Blue
git checkout gh-pages

# Clean old files and copy new ones
Write-Host "Updating files..." -ForegroundColor Blue
Remove-Item -Recurse -Force static/ -ErrorAction SilentlyContinue
Remove-Item *.html, asset-manifest.json, manifest.json, robots.txt, favicon.ico, logo192.png, logo512.png -ErrorAction SilentlyContinue
Copy-Item -Recurse build/* .

# Ensure .nojekyll file exists to disable Jekyll processing
if (!(Test-Path ".nojekyll")) {
    New-Item -ItemType File -Name ".nojekyll" -Force | Out-Null
    Write-Host "Created .nojekyll file to disable Jekyll processing" -ForegroundColor Green
}

# Check for changes
$status = git status --porcelain
if ($status) {
    git add .
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "Deploy: GitHub Pages update $timestamp - Latest Quibish features"
    git push origin gh-pages
    Write-Host "Successfully deployed!" -ForegroundColor Green
    Write-Host "Live at: https://colinnebula.github.io/quibish/" -ForegroundColor Cyan
} else {
    Write-Host "No changes to deploy" -ForegroundColor Yellow
}

# Switch back to main
git checkout main
Write-Host "Deployment complete!" -ForegroundColor Green