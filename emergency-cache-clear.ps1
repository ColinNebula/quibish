#!/usr/bin/env pwsh
# EMERGENCY CACHE CLEAR - Run this to force clear everything

Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║           🚨 EMERGENCY CACHE CLEAR SCRIPT 🚨             ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Red

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Delete the build folder" -ForegroundColor White
Write-Host "  2. Rebuild the project" -ForegroundColor White
Write-Host "  3. Start the dev server`n" -ForegroundColor White

Read-Host "Press ENTER to continue or Ctrl+C to cancel"

Write-Host "`n[1/3] Deleting build folder..." -ForegroundColor Cyan
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Build folder deleted`n" -ForegroundColor Green

Write-Host "[2/3] Building project..." -ForegroundColor Cyan
npm run build
Write-Host "`n✅ Build complete`n" -ForegroundColor Green

Write-Host "[3/3] Starting dev server..." -ForegroundColor Cyan
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║                   📱 TESTING INSTRUCTIONS                  ║" -ForegroundColor Yellow
Write-Host "╠═══════════════════════════════════════════════════════════╣" -ForegroundColor Yellow
Write-Host "║                                                           ║" -ForegroundColor Yellow
Write-Host "║  After server starts:                                     ║" -ForegroundColor White
Write-Host "║                                                           ║" -ForegroundColor Yellow
Write-Host "║  🌐 Desktop Testing:                                      ║" -ForegroundColor Cyan
Write-Host "║    1. Open INCOGNITO: Ctrl+Shift+N                        ║" -ForegroundColor White
Write-Host "║    2. Go to: http://localhost:3000                        ║" -ForegroundColor White
Write-Host "║    3. Open DevTools: F12                                  ║" -ForegroundColor White
Write-Host "║    4. Toggle device toolbar: Ctrl+Shift+M                 ║" -ForegroundColor White
Write-Host "║    5. Select iPhone or Android device                     ║" -ForegroundColor White
Write-Host "║    6. Go to a chat and check message layout               ║" -ForegroundColor White
Write-Host "║                                                           ║" -ForegroundColor Yellow
Write-Host "║  📱 Mobile Device Testing:                                ║" -ForegroundColor Cyan
Write-Host "║    1. Get your computer's IP: ipconfig                    ║" -ForegroundColor White
Write-Host "║    2. On mobile, visit: http://YOUR-IP:3000               ║" -ForegroundColor White
Write-Host "║    3. Clear mobile browser cache first!                   ║" -ForegroundColor White
Write-Host "║                                                           ║" -ForegroundColor Yellow
Write-Host "║  ✅ Expected Result:                                      ║" -ForegroundColor Green
Write-Host "║    • Messages start at TOP of screen                      ║" -ForegroundColor White
Write-Host "║    • No excessive whitespace above messages               ║" -ForegroundColor White
Write-Host "║    • Natural chat layout (WhatsApp-style)                 ║" -ForegroundColor White
Write-Host "║    • Messages don't grow to fill empty space              ║" -ForegroundColor White
Write-Host "║                                                           ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Yellow

npm start
