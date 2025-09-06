# GitHub Pages deployment script for Quibish
Write-Host "Starting GitHub Pages deployment..." -ForegroundColor Green

# Build the app
Write-Host "Building the app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Create gh-pages branch and push
Write-Host "Setting up gh-pages branch..." -ForegroundColor Yellow

# Check if gh-pages branch exists
$branch_exists = git branch -r | Select-String "origin/gh-pages"

if (-not $branch_exists) {
    Write-Host "Creating gh-pages branch..." -ForegroundColor Yellow
    git checkout --orphan gh-pages
    git rm -rf .
} else {
    Write-Host "Switching to gh-pages branch..." -ForegroundColor Yellow
    git checkout gh-pages
    git pull origin gh-pages
    git rm -rf . --ignore-unmatch
}

# Copy build files
Write-Host "Copying build files..." -ForegroundColor Yellow
Copy-Item ".\build\*" "." -Recurse -Force

# Commit and push
Write-Host "Committing and pushing to gh-pages..." -ForegroundColor Yellow
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# Switch back to main
Write-Host "Switching back to main branch..." -ForegroundColor Yellow
git checkout main

Write-Host "Deployment complete! Your app should be available at: https://colinNebula.github.io/quibish" -ForegroundColor Green