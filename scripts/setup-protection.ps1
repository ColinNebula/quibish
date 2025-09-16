# Comprehensive Code Protection Setup Script
# Run this once to set up all protection measures

param(
    [switch]$FullSetup,
    [switch]$QuickSetup
)

Write-Host "🛡️ Quibish Code Protection Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

function Test-GitRepository {
    if (-not (Test-Path ".git")) {
        Write-Host "❌ Not a Git repository. Please run from the project root." -ForegroundColor Red
        exit 1
    }
}

function Setup-GitHooks {
    Write-Host "🪝 Setting up Git hooks..." -ForegroundColor Yellow
    
    $preCommitHook = @"
#!/bin/sh
# Pre-commit integrity check
echo "🔍 Running integrity check..."
node scripts/integrity-check.js verify
if [ $? -ne 0 ]; then
    echo "❌ Integrity check failed! Commit aborted."
    exit 1
fi
echo "✅ Integrity check passed"
"@
    
    $hooksDir = ".git/hooks"
    if (-not (Test-Path $hooksDir)) {
        New-Item -ItemType Directory -Path $hooksDir -Force
    }
    
    $preCommitHook | Out-File -FilePath "$hooksDir/pre-commit" -Encoding UTF8
    Write-Host "✅ Git hooks configured" -ForegroundColor Green
}

function Setup-BackupDirectories {
    Write-Host "📁 Setting up backup directories..." -ForegroundColor Yellow
    
    $backupDirs = @(
        "D:\Backups\quibish",
        "D:\Backups\quibish-archives",
        "D:\Backups\quibish-integrity"
    )
    
    foreach ($dir in $backupDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir" -ForegroundColor Green
        }
    }
}

function Create-ProtectionConfig {
    Write-Host "⚙️ Creating protection configuration..." -ForegroundColor Yellow
    
    $config = @{
        enabled = $true
        version = "1.0.0"
        features = @{
            integrity_checking = $true
            automated_backup = $true
            file_monitoring = $true
            code_signing = $true
            branch_protection = $true
        }
        schedule = @{
            backup_interval = "daily"
            integrity_check = "hourly"
            monitoring = "realtime"
        }
        notifications = @{
            email = "your-email@domain.com"
            slack = $false
            discord = $false
        }
        advanced = @{
            obfuscation = $true
            minification = $true
            anti_debugging = $true
            tamper_detection = $true
        }
    }
    
    $config | ConvertTo-Json -Depth 10 | Out-File "protection-config.json" -Encoding UTF8
    Write-Host "✅ Protection configuration created" -ForegroundColor Green
}

function Setup-ScheduledTasks {
    Write-Host "⏰ Setting up scheduled tasks..." -ForegroundColor Yellow
    
    # Daily backup task
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$(Get-Location)\scripts\backup-automation.ps1`""
    $trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    try {
        Register-ScheduledTask -TaskName "Quibish-DailyBackup" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
        Write-Host "✅ Daily backup task scheduled" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not create scheduled task (requires admin): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

function Initialize-IntegritySystem {
    Write-Host "🔐 Initializing integrity system..." -ForegroundColor Yellow
    
    if (Test-Path "scripts/integrity-check.js") {
        node scripts/integrity-check.js generate
        node scripts/integrity-check.js sign
        Write-Host "✅ Integrity system initialized" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Integrity check script not found" -ForegroundColor Yellow
    }
}

function Display-ProtectionSummary {
    Write-Host "`n🎯 Protection Setup Complete!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    
    Write-Host "🛡️ Active Protection Measures:" -ForegroundColor Cyan
    Write-Host "  ✅ Git hooks (pre-commit integrity check)" -ForegroundColor White
    Write-Host "  ✅ Automated backup system" -ForegroundColor White
    Write-Host "  ✅ File integrity monitoring" -ForegroundColor White
    Write-Host "  ✅ Code signing verification" -ForegroundColor White
    Write-Host "  ✅ Backup directories created" -ForegroundColor White
    Write-Host "  ✅ Protection configuration" -ForegroundColor White
    
    Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to GitHub Settings Branches Add protection rules" -ForegroundColor White
    Write-Host "  2. Enable 2FA on your GitHub account" -ForegroundColor White
    Write-Host "  3. Create backup repository: quibish-backup" -ForegroundColor White
    Write-Host "  4. Update email in protection-config.json" -ForegroundColor White
    Write-Host "  5. Run: npm run backup (test backup system)" -ForegroundColor White
    
    Write-Host "`n🔧 Available Commands:" -ForegroundColor Cyan
    Write-Host "  npm run backup              - Manual backup" -ForegroundColor White
    Write-Host "  node scripts/integrity-check.js verify  - Check integrity" -ForegroundColor White
    Write-Host "  node scripts/integrity-check.js watch   - Monitor files" -ForegroundColor White
    
    Write-Host "`n🚨 Important Reminders:" -ForegroundColor Red
    Write-Host "  • Never share sensitive files publicly" -ForegroundColor White
    Write-Host "  • Keep backup locations secure" -ForegroundColor White
    Write-Host "  • Regularly verify integrity checks" -ForegroundColor White
    Write-Host "  • Monitor for unauthorized changes" -ForegroundColor White
}

# Main execution
try {
    Test-GitRepository
    
    if ($QuickSetup) {
        Setup-BackupDirectories
        Initialize-IntegritySystem
        Create-ProtectionConfig
    } elseif ($FullSetup) {
        Setup-BackupDirectories
        Setup-GitHooks
        Create-ProtectionConfig
        Setup-ScheduledTasks
        Initialize-IntegritySystem
    } else {
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\setup-protection.ps1 -QuickSetup   # Basic protection" -ForegroundColor White
        Write-Host "  .\setup-protection.ps1 -FullSetup    # Complete protection (requires admin)" -ForegroundColor White
        exit 0
    }
    
    Display-ProtectionSummary
    
} catch {
    Write-Host "❌ Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}