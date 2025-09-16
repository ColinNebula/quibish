# Automated Backup Script
# Run this daily to backup your code to multiple locations

# Exit on any error
$ErrorActionPreference = "Stop"

Write-Host "🔄 Starting automated backup process..." -ForegroundColor Green

try {
    # 1. Create local backup with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
    $backupDir = "D:\Backups\quibish-$timestamp"
    
    Write-Host "📁 Creating local backup at: $backupDir" -ForegroundColor Yellow
    
    # Create backup directory
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    # Copy entire project (excluding node_modules and .git)
    robocopy . $backupDir /E /XD node_modules .git build /XF *.log /NFL /NDL /NJH /NJS
    
    # 2. Push to main repository
    Write-Host "🚀 Pushing to main repository..." -ForegroundColor Yellow
    git add .
    git commit -m "Automated backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ErrorAction SilentlyContinue
    git push origin main
    
    # 3. Push to backup repository (if it exists)
    Write-Host "💾 Pushing to backup repository..." -ForegroundColor Yellow
    git push backup main -ErrorAction SilentlyContinue
    
    # 4. Create compressed archive
    $archivePath = "D:\Backups\quibish-archive-$timestamp.zip"
    Write-Host "📦 Creating compressed archive: $archivePath" -ForegroundColor Yellow
    Compress-Archive -Path $backupDir -DestinationPath $archivePath -Force
    
    # 5. Clean up old local backups (keep last 7 days)
    Get-ChildItem "D:\Backups" -Filter "quibish-*" | 
        Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } | 
        Remove-Item -Recurse -Force
    
    Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "📍 Local backup: $backupDir" -ForegroundColor Cyan
    Write-Host "📍 Archive: $archivePath" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Backup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. Verify backup integrity
Write-Host "🔍 Verifying backup integrity..." -ForegroundColor Yellow

$sourceFiles = Get-ChildItem . -Recurse -File | Where-Object { 
    $_.FullName -notmatch "node_modules|\.git|build|\.log$" 
}
$backupFiles = Get-ChildItem $backupDir -Recurse -File

if ($sourceFiles.Count -eq $backupFiles.Count) {
    Write-Host "✅ Backup integrity verified: $($sourceFiles.Count) files backed up" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: File count mismatch. Source: $($sourceFiles.Count), Backup: $($backupFiles.Count)" -ForegroundColor Yellow
}

Write-Host "🎯 Backup process completed!" -ForegroundColor Green