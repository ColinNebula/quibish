#!/bin/bash
# Build script for WebAssembly module
# Requires Emscripten SDK (emsdk) to be installed and activated

echo "🔨 Building Image Processor WebAssembly Module..."

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "❌ Error: Emscripten compiler (emcc) not found!"
    echo "Please install Emscripten SDK:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    exit 1
fi

# Compile C++ to WebAssembly
emcc image_processor.cpp \
    -o ../public/wasm/image_processor.js \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createImageProcessor" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MAXIMUM_MEMORY=512MB \
    -s TOTAL_STACK=256MB \
    -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall"]' \
    --bind \
    -O3 \
    -std=c++17

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📦 Output files:"
    echo "   - public/wasm/image_processor.js"
    echo "   - public/wasm/image_processor.wasm"
    
    # Check file sizes
    JS_SIZE=$(du -h ../public/wasm/image_processor.js | cut -f1)
    WASM_SIZE=$(du -h ../public/wasm/image_processor.wasm | cut -f1)
    echo "📊 File sizes: JS=$JS_SIZE, WASM=$WASM_SIZE"
else
    echo "❌ Build failed!"
    exit 1
fi
