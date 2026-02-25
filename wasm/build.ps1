# PowerShell build script for WebAssembly module
# Requires Emscripten SDK (emsdk) to be installed and activated

Write-Host "🔨 Building Image Processor WebAssembly Module..." -ForegroundColor Cyan

# Check if emcc is available
$emccPath = Get-Command emcc -ErrorAction SilentlyContinue
if (-not $emccPath) {
    Write-Host "❌ Error: Emscripten compiler (emcc) not found!" -ForegroundColor Red
    Write-Host "Please install Emscripten SDK:" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/emscripten-core/emsdk.git"
    Write-Host "  cd emsdk"
    Write-Host "  .\emsdk install latest"
    Write-Host "  .\emsdk activate latest"
    Write-Host "  .\emsdk_env.ps1"
    exit 1
}

# Create output directory if it doesn't exist
$outputDir = "..\public\wasm"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Compile C++ to WebAssembly
emcc image_processor.cpp `
    -o ..\public\wasm\image_processor.js `
    -s WASM=1 `
    -s MODULARIZE=1 `
    -s EXPORT_ES6=1 `
    -s EXPORT_NAME="createImageProcessor" `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s MAXIMUM_MEMORY=512MB `
    -s TOTAL_STACK=256MB `
    -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall"]' `
    --bind `
    -O3 `
    -std=c++17

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "📦 Output files:" -ForegroundColor Cyan
    Write-Host "   - public/wasm/image_processor.js"
    Write-Host "   - public/wasm/image_processor.wasm"
    
    # Check file sizes
    $jsFile = Get-Item "..\public\wasm\image_processor.js"
    $wasmFile = Get-Item "..\public\wasm\image_processor.wasm"
    $jsSize = [math]::Round($jsFile.Length / 1KB, 2)
    $wasmSize = [math]::Round($wasmFile.Length / 1KB, 2)
    Write-Host "📊 File sizes: JS=${jsSize}KB, WASM=${wasmSize}KB" -ForegroundColor Cyan
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
