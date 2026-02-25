# Build all WebAssembly modules
Write-Host "🔨 Building All WebAssembly Modules..." -ForegroundColor Cyan

$modules = @(
    @{name="Image Processor"; file="image_processor.cpp"; output="image_processor"},
    @{name="Video Filters"; file="video_filters.cpp"; output="video_filters"},
    @{name="Message Search"; file="message_search.cpp"; output="message_search"},
    @{name="Media Processor"; file="media_processor.cpp"; output="media_processor"},
    @{name="Sync Engine"; file="sync_engine.cpp"; output="sync_engine"},
    @{name="Encryption"; file="encryption.cpp"; output="encryption"},
    @{name="Audio Processor"; file="audio_processor.cpp"; output="audio_processor"}
)

$outputDir = "..\public\wasm"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "📁 Created output directory: $outputDir" -ForegroundColor Green
}

$successCount = 0
$failCount = 0

foreach ($module in $modules) {
    Write-Host "`n🔧 Building $($module.name)..." -ForegroundColor Yellow
    
    $buildCmd = @"
emcc $($module.file) ``
    -o $outputDir\$($module.output).js ``
    -s WASM=1 ``
    -s MODULARIZE=1 ``
    -s EXPORT_ES6=1 ``
    -s EXPORT_NAME="create$($module.output.Replace('_',''))" ``
    -s ALLOW_MEMORY_GROWTH=1 ``
    -s MAXIMUM_MEMORY=512MB ``
    -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall"]' ``
    --bind ``
    -O3 ``
    -std=c++17
"@
    
    try {
        Invoke-Expression $buildCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $($module.name) built successfully!" -ForegroundColor Green
            
            $jsFile = Get-Item "$outputDir\$($module.output).js"
            $wasmFile = Get-Item "$outputDir\$($module.output).wasm"
            $jsSize = [math]::Round($jsFile.Length / 1KB, 1)
            $wasmSize = [math]::Round($wasmFile.Length / 1KB, 1)
            
            Write-Host "   📊 Sizes: JS=${jsSize}KB, WASM=${wasmSize}KB" -ForegroundColor Cyan
            $successCount++
        } else {
            Write-Host "   ❌ Build failed for $($module.name)" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "   ❌ Error building $($module.name): $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "📦 Build Summary" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "📁 Output: $outputDir" -ForegroundColor Cyan

if ($successCount -eq $modules.Count) {
    Write-Host "`n🎉 All modules built successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some modules failed to build" -ForegroundColor Yellow
}
