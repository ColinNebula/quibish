# Persistent Server Manager
# This script keeps the Node.js server running with auto-restart capabilities

param(
    [string]$ServerScript = "stable-server.js",
    [int]$MaxRestarts = 10,
    [int]$RestartDelay = 5,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Quibish Server Manager"

# Configuration
$BackendPath = "D:\Development\quibish\backend"
$LogPath = "D:\Development\quibish\logs"
$ServerPort = 5001
$RestartCount = 0
$StartTime = Get-Date

# Ensure log directory exists
if (!(Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$LogFile = Join-Path $LogPath "server-manager-$(Get-Date -Format 'yyyy-MM-dd').log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # Write to console with colors
    switch ($Level) {
        "ERROR" { Write-Host $LogEntry -ForegroundColor Red }
        "WARN"  { Write-Host $LogEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $LogEntry -ForegroundColor Green }
        default { Write-Host $LogEntry -ForegroundColor White }
    }
    
    # Write to log file
    Add-Content -Path $LogFile -Value $LogEntry
}

function Test-ServerHealth {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$ServerPort/api/health" -Method GET -TimeoutSec 10
        return $response.status -eq "online"
    }
    catch {
        return $false
    }
}

function Stop-ExistingServer {
    Write-Log "Checking for existing server processes on port $ServerPort..."
    
    try {
        # Find processes using the port
        $processes = Get-NetTCPConnection -LocalPort $ServerPort -ErrorAction SilentlyContinue | 
                    Select-Object -ExpandProperty OwningProcess | 
                    ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }
        
        if ($processes) {
            foreach ($proc in $processes) {
                Write-Log "Stopping existing server process: $($proc.ProcessName) (PID: $($proc.Id))" "WARN"
                Stop-Process -Id $proc.Id -Force
                Start-Sleep -Seconds 2
            }
        }
    }
    catch {
        Write-Log "No existing server processes found or unable to check" "INFO"
    }
}

function Start-Server {
    Write-Log "Starting server: $ServerScript" "INFO"
    
    # Change to backend directory
    Set-Location $BackendPath
    
    # Start the server process
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "node"
    $processInfo.Arguments = $ServerScript
    $processInfo.WorkingDirectory = $BackendPath
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $false
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    # Event handlers for output
    $process.add_OutputDataReceived({
        param($sender, $e)
        if ($e.Data) {
            Write-Log "SERVER: $($e.Data)" "INFO"
        }
    })
    
    $process.add_ErrorDataReceived({
        param($sender, $e)
        if ($e.Data) {
            Write-Log "SERVER ERROR: $($e.Data)" "ERROR"
        }
    })
    
    try {
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        Write-Log "Server process started with PID: $($process.Id)" "SUCCESS"
        return $process
    }
    catch {
        Write-Log "Failed to start server: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Monitor-Server {
    param($Process)
    
    $healthCheckInterval = 30 # seconds
    $lastHealthCheck = Get-Date
    
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if process is still running
        if ($Process.HasExited) {
            Write-Log "Server process has exited with code: $($Process.ExitCode)" "ERROR"
            return $false
        }
        
        # Periodic health check
        $now = Get-Date
        if (($now - $lastHealthCheck).TotalSeconds -ge $healthCheckInterval) {
            $lastHealthCheck = $now
            
            if (Test-ServerHealth) {
                Write-Log "Health check passed - server is responding" "SUCCESS"
            } else {
                Write-Log "Health check failed - server not responding" "WARN"
                # Give it a few more seconds before considering it failed
                Start-Sleep -Seconds 10
                if (-not (Test-ServerHealth)) {
                    Write-Log "Server is unresponsive - triggering restart" "ERROR"
                    return $false
                }
            }
        }
        
        # Check for user input (Ctrl+C simulation)
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Modifiers -eq [ConsoleModifiers]::Control -and $key.Key -eq [ConsoleKey]::C) {
                Write-Log "Shutdown requested by user" "INFO"
                return "shutdown"
            }
        }
    }
}

# Main execution
Write-Log "=== Quibish Server Manager Started ===" "SUCCESS"
Write-Log "Server Script: $ServerScript" "INFO"
Write-Log "Max Restarts: $MaxRestarts" "INFO"
Write-Log "Backend Path: $BackendPath" "INFO"
Write-Log "Log File: $LogFile" "INFO"
Write-Log "Press Ctrl+C to shutdown gracefully" "INFO"

# Stop any existing servers
Stop-ExistingServer

while ($RestartCount -le $MaxRestarts) {
    Write-Log "=== Starting server (Attempt $($RestartCount + 1)) ===" "INFO"
    
    $serverProcess = Start-Server
    
    if ($null -eq $serverProcess) {
        Write-Log "Failed to start server" "ERROR"
        $RestartCount++
        
        if ($RestartCount -le $MaxRestarts) {
            Write-Log "Waiting $RestartDelay seconds before retry..." "WARN"
            Start-Sleep -Seconds $RestartDelay
        }
        continue
    }
    
    # Wait for server to be ready
    Write-Log "Waiting for server to be ready..." "INFO"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        if (Test-ServerHealth) {
            Write-Log "Server is ready and responding!" "SUCCESS"
            $ready = $true
            break
        }
    }
    
    if (-not $ready) {
        Write-Log "Server failed to become ready within 60 seconds" "ERROR"
        $serverProcess.Kill()
        $RestartCount++
        continue
    }
    
    # Monitor the server
    $result = Monitor-Server -Process $serverProcess
    
    if ($result -eq "shutdown") {
        Write-Log "Graceful shutdown initiated" "INFO"
        $serverProcess.Kill()
        break
    }
    
    # Server crashed or became unresponsive
    Write-Log "Server monitoring detected failure" "ERROR"
    
    try {
        if (-not $serverProcess.HasExited) {
            $serverProcess.Kill()
        }
    }
    catch {
        Write-Log "Error killing server process: $($_.Exception.Message)" "WARN"
    }
    
    $RestartCount++
    
    if ($RestartCount -le $MaxRestarts) {
        Write-Log "Restarting server in $RestartDelay seconds... (Restart $RestartCount/$MaxRestarts)" "WARN"
        Start-Sleep -Seconds $RestartDelay
    }
}

if ($RestartCount -gt $MaxRestarts) {
    Write-Log "Maximum restart attempts ($MaxRestarts) exceeded. Server manager exiting." "ERROR"
    exit 1
} else {
    Write-Log "Server manager shutdown complete" "SUCCESS"
    exit 0
}