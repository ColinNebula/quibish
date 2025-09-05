# Smoke-check script: runs a production build to ensure no CSS/JS parse errors
# Usage: .\tools\smoke-check.ps1

Write-Host "Starting smoke-check: running production build..."
# Don't force CI=true here; we want to surface parse errors but not fail on lint warnings.
# Run npm run build and capture output
try {
    # Use cmd.exe to invoke npm so batch shims (npm.cmd) are handled correctly on Windows
    $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run build' -NoNewWindow -PassThru -Wait -RedirectStandardOutput build-output.txt -RedirectStandardError build-errors.txt
    $out = Get-Content build-output.txt -Raw -ErrorAction SilentlyContinue
    $err = Get-Content build-errors.txt -Raw -ErrorAction SilentlyContinue
    Write-Host "Build finished with exit code $($proc.ExitCode). Scanning output for parse errors..."
    $allOutput = "" + $out + "`n`n" + $err
    # Detect hard compile failures (syntax/module build failed) but ignore lint warnings
    if ($allOutput -match 'Module build failed|SyntaxError|Failed to compile') {
        Write-Host "Detected compile or parse errors during build:\n"
        # Print only the relevant snippets
        $matches = Select-String -InputObject $allOutput -Pattern 'Module build failed|SyntaxError|Failed to compile' -AllMatches
        $matches | ForEach-Object { Write-Host $_.Line }
        exit 2
    }
    Write-Host "No obvious CSS/JS parse errors found in build output. Smoke-check passed."
    exit 0
}
catch {
    Write-Host "Exception while running build: $_"
    exit 3
}
