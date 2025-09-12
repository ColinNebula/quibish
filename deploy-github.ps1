#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Quibish app to GitHub Pages

.DESCRIPTION
    This script builds the React app and deploys it to GitHub Pages.
    It handles all the necessary steps including:
    - Building the production version
    - Switching to gh-pages branch
    - Copying build files
    - Committing and pushing changes

.EXAMPLE
    .\deploy-github.ps1
#>

Write-Host "🚀 Starting GitHub Pages deployment for Quibish..." -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Error "❌ package.json not found. Please run this script from the project root."
    exit 1
}

# Save current branch
$currentBranch = git branch --show-current
Write-Host "📍 Current branch: $currentBranch" -ForegroundColor Yellow

# Ensure we're on main and up to date
Write-Host "🔄 Switching to main branch..." -ForegroundColor Blue
git checkout main
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to switch to main branch"
    exit 1
}

# Build the production version
Write-Host "🏗️ Building production version..." -ForegroundColor Blue
npx react-scripts build
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build failed"
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green

# Switch to gh-pages branch
Write-Host "🔄 Switching to gh-pages branch..." -ForegroundColor Blue
git checkout gh-pages
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Failed to switch to gh-pages branch"
    exit 1
}

# Clean old files
Write-Host "🧹 Cleaning old deployment files..." -ForegroundColor Blue
Remove-Item -Recurse -Force static/ -ErrorAction SilentlyContinue
Remove-Item *.html, asset-manifest.json, manifest.json, robots.txt, favicon.ico, logo192.png, logo512.png -ErrorAction SilentlyContinue

# Copy new build files
Write-Host "📋 Copying new build files..." -ForegroundColor Blue
Copy-Item -Recurse build/* .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    # Add and commit changes
    Write-Host "📝 Adding files to git..." -ForegroundColor Blue
    git add .
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = @"
🚀 DEPLOY: GitHub Pages update - $timestamp

✨ Latest features:
• International calling (80+ countries)
• Free calling system
• Donation support system
• End-to-end encryption
• PWA capabilities
• Voice calling with WebRTC
• Responsive design
• File sharing & media

🌐 Live at: https://colinnebula.github.io/quibish/
"@

    Write-Host "💾 Committing changes..." -ForegroundColor Blue
    git commit -m $commitMessage
    
    # Push to GitHub
    Write-Host "📤 Pushing to GitHub Pages..." -ForegroundColor Blue
    git push origin gh-pages
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Failed to push to GitHub Pages"
        exit 1
    }
    
    Write-Host "🎉 Successfully deployed to GitHub Pages!" -ForegroundColor Green
    Write-Host "🌐 Your app will be available at: https://colinnebula.github.io/quibish/" -ForegroundColor Cyan
    Write-Host "⏱️ Note: It may take 5-10 minutes for changes to appear" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️ No changes to deploy" -ForegroundColor Yellow
}

# Switch back to original branch
Write-Host "🔄 Switching back to $currentBranch..." -ForegroundColor Blue
git checkout $currentBranch

Write-Host "✅ Deployment process completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure repository is public: https://github.com/ColinNebula/quibish/settings" -ForegroundColor White
Write-Host "2. Enable GitHub Pages: Settings → Pages → Deploy from branch → gh-pages" -ForegroundColor White
Write-Host "3. Wait 5-10 minutes for deployment" -ForegroundColor White
Write-Host "4. Visit: https://colinnebula.github.io/quibish/" -ForegroundColor White