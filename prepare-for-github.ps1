<#
.SYNOPSIS
    Quibish - Prepare for GitHub push safety checks.
.DESCRIPTION
    Read-only checks before pushing to GitHub:
      1. .gitignore coverage
      2. .env.example templates present
      3. No real .env files tracked by git
      4. Hardcoded secrets scan
      5. Large files warning (> LargeFileLimitMB)
      6. Sensitive file types in staging area
      7. Runtime data files tracked

    Run from the repo root:  .\prepare-for-github.ps1
#>

param([int]$LargeFileLimitMB = 50)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# Resolve git executable
$gitExe = $null
$gitCandidates = @(
    "git",
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files\Git\bin\git.exe",
    "$env:ProgramFiles\Git\cmd\git.exe",
    "$env:LocalAppData\Programs\Git\cmd\git.exe"
)
foreach ($c in $gitCandidates) {
    if (Get-Command $c -ErrorAction SilentlyContinue) { $gitExe = $c; break }
}
if (-not $gitExe) {
    Write-Host "[FAIL]  git not found in PATH or common locations. Install Git for Windows." -ForegroundColor Red
    exit 1
}

function Invoke-Git {
    & $gitExe @args 2>$null
}

function Write-Header([string]$Title) {
    Write-Host ""
    Write-Host ("-" * 60) -ForegroundColor DarkGray
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host ("-" * 60) -ForegroundColor DarkGray
}
function Write-Pass([string]$Msg) { Write-Host "  [PASS]  $Msg" -ForegroundColor Green  }
function Write-Warn([string]$Msg) { Write-Host "  [WARN]  $Msg" -ForegroundColor Yellow }
function Write-Fail([string]$Msg) { Write-Host "  [FAIL]  $Msg" -ForegroundColor Red    }
function Write-Info([string]$Msg) { Write-Host "  [INFO]  $Msg" -ForegroundColor Gray   }

$Issues   = [System.Collections.Generic.List[string]]::new()
$Warnings = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path ".git")) {
    Write-Fail "No .git directory found. Run from the repository root."
    exit 1
}

# ----------------------------------------------------------------
# CHECK 1 -- .gitignore coverage
# ----------------------------------------------------------------
Write-Header "CHECK 1 -- .gitignore coverage"
if (-not (Test-Path ".gitignore")) {
    Write-Fail ".gitignore not found!"
    $Issues.Add("Missing .gitignore")
} else {
    $gi = Get-Content ".gitignore" -Raw
    $required = @(
        @{ P = 'node_modules';             L = 'node_modules' },
        @{ P = '\.env';                    L = '.env files' },
        @{ P = '!\.env\.example';          L = '.env.example exception' },
        @{ P = '/build|build/';            L = 'build output' },
        @{ P = 'uploads/';                 L = 'uploads directory' },
        @{ P = '\.pem|\.key|\.p12|\.pfx';  L = 'SSL/private key files' },
        @{ P = '\.sqlite|\.db';            L = 'database files' }
    )
    foreach ($r in $required) {
        if ($gi -match $r.P) { Write-Pass "$($r.L) is covered" }
        else {
            Write-Warn "$($r.L) is NOT in .gitignore"
            $Warnings.Add("gitignore missing: $($r.L)")
        }
    }
}

# ----------------------------------------------------------------
# CHECK 2 -- .env.example files present
# ----------------------------------------------------------------
Write-Header "CHECK 2 -- .env.example templates"
foreach ($p in @(".env.example", "backend\.env.example")) {
    if (Test-Path $p) { Write-Pass "$p exists" }
    else {
        Write-Warn "$p is missing"
        $Warnings.Add("Missing $p")
    }
}

# ----------------------------------------------------------------
# CHECK 3 -- No tracked .env files
# ----------------------------------------------------------------
Write-Header "CHECK 3 -- Tracked .env files"
$trackedEnv = Invoke-Git ls-files --cached |
              Where-Object { ($_ -match '(^|/)\.env($|\.)') -and ($_ -notmatch '\.env\.example$') }
if ($trackedEnv) {
    foreach ($f in $trackedEnv) {
        Write-Fail "TRACKED SECRET FILE: $f"
        $Issues.Add("Tracked .env file: $f")
    }
    Write-Info "Run:  git rm --cached FILENAME    to stop tracking it"
} else {
    Write-Pass "No .env files are tracked by git"
}

# ----------------------------------------------------------------
# CHECK 4 -- Hardcoded secrets in source files
# ----------------------------------------------------------------
Write-Header "CHECK 4 -- Hardcoded secrets scan"

# Patterns matched as whole-line context to avoid false positives.
# Each entry has: Regex (applied to file content), Label, and optional
# ExcludePattern so lines like banned-password lists are not flagged.
$secretPatterns = @(
    @{
        Regex   = 'your-super-secret-jwt-key'
        Label   = 'Known weak JWT fallback string'
        Exclude = ''
    },
    @{
        # Match actual assignment/default value, not validation blacklists
        Regex   = "(const|var|let)\s+\w*[Pp]assword\w*\s*=\s*[`'`"][^`'`"]{4,}"
        Label   = 'Hardcoded password assignment'
        Exclude = ''
    },
    @{
        # AWS-style access keys: AKIA followed by 16+ uppercase alphanumeric chars
        Regex   = 'AKIA[0-9A-Z]{16}'
        Label   = 'Possible AWS Access Key ID'
        Exclude = ''
    },
    @{
        # Stripe secret keys
        Regex   = 'sk_(live|test)_[0-9a-zA-Z]{24,}'
        Label   = 'Possible Stripe secret key'
        Exclude = ''
    }
)

$searchDirs = @('src','backend\routes','backend\services','backend\middleware','backend\config')
$secretHits = [System.Collections.Generic.List[string]]::new()

foreach ($dir in $searchDirs) {
    if (-not (Test-Path $dir)) { continue }
    $files = Get-ChildItem -Path $dir -Recurse -File -Include '*.js','*.ts','*.jsx','*.tsx' -ErrorAction SilentlyContinue |
             Where-Object { $_.FullName -notmatch 'node_modules' }
    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        foreach ($pat in $secretPatterns) {
            if ($content -match $pat.Regex) {
                $rel = $file.FullName.Replace((Get-Location).Path + "\", "")
                $msg = "$($pat.Label) in $rel"
                Write-Fail $msg
                $secretHits.Add($msg)
                $Issues.Add($msg)
            }
        }
    }
}
if ($secretHits.Count -eq 0) { Write-Pass "No hardcoded secret patterns detected" }

# ----------------------------------------------------------------
# CHECK 5 -- Large files
# ----------------------------------------------------------------
Write-Header "CHECK 5 -- Large files (> ${LargeFileLimitMB} MB)"
$limitBytes = $LargeFileLimitMB * 1MB
$largeFiles = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue |
              Where-Object {
                  $_.Length -gt $limitBytes -and
                  $_.FullName -notmatch '\\node_modules\\' -and
                  $_.FullName -notmatch '\\.git\\'
              }
if ($largeFiles) {
    foreach ($f in $largeFiles) {
        $rel = $f.FullName.Replace((Get-Location).Path + "\", "")
        $mb  = [math]::Round($f.Length / 1MB, 1)
        Write-Warn "Large file (${mb} MB): $rel"
        $Warnings.Add("Large file ${mb}MB: $rel")
    }
    Write-Info "Add large files to .gitignore or consider Git LFS."
} else {
    Write-Pass "No files exceed ${LargeFileLimitMB} MB"
}

# ----------------------------------------------------------------
# CHECK 6 -- Sensitive file types in staging area
# ----------------------------------------------------------------
Write-Header "CHECK 6 -- Sensitive file types in staging area"
$dangerExts   = @('*.pem','*.key','*.p12','*.pfx','*.crt','*.sqlite','*.sqlite3','*.db')
$staged       = Invoke-Git diff --cached --name-only
$stagedDanger = $staged | Where-Object {
    $f = $_
    ($dangerExts | Where-Object { $f -like $_ }).Count -gt 0
}
if ($stagedDanger) {
    foreach ($f in $stagedDanger) {
        Write-Fail "Sensitive file staged: $f"
        $Issues.Add("Staged sensitive file: $f")
    }
} else {
    Write-Pass "No sensitive file types are staged"
}

# ----------------------------------------------------------------
# CHECK 7 -- Runtime data files tracked by git
# ----------------------------------------------------------------
Write-Header "CHECK 7 -- Runtime data files"
$dataPatterns = @('backend/data/*.json','backend/data/*.db')
$dataIssues   = $false
foreach ($pattern in $dataPatterns) {
    $tracked = Invoke-Git ls-files --cached -- $pattern
    if ($tracked) {
        $dataIssues = $true
        foreach ($f in $tracked) {
            Write-Warn "Runtime data tracked: $f  (may contain live user data)"
            $Warnings.Add("Runtime data tracked: $f")
        }
    }
}
if (-not $dataIssues) { Write-Pass "No runtime data files are tracked" }

# ================================================================
# SUMMARY
# ================================================================
Write-Header "SUMMARY"
if ($Issues.Count -eq 0 -and $Warnings.Count -eq 0) {
    Write-Host ""
    Write-Host "  All checks passed -- safe to push to GitHub!" -ForegroundColor Green
    Write-Host ""
} else {
    if ($Issues.Count -gt 0) {
        Write-Host ""
        Write-Host "  $($Issues.Count) ISSUE(S) must be fixed before pushing:" -ForegroundColor Red
        $Issues   | ForEach-Object { Write-Host "    * $_" -ForegroundColor Red }
    }
    if ($Warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "  $($Warnings.Count) WARNING(S) to review:" -ForegroundColor Yellow
        $Warnings | ForEach-Object { Write-Host "    * $_" -ForegroundColor Yellow }
    }
    Write-Host ""
}

Write-Header "Git Status"
Invoke-Git status --short
Write-Host ""

if ($Issues.Count -gt 0) {
    Write-Host "  Resolve all issues listed above before pushing." -ForegroundColor Red
    exit 1
}
exit 0