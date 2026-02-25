/**
 * Fast Image Processing Module (C++ -> WebAssembly)
 * Handles image compression, resizing, and optimization
 * Significantly faster than JavaScript for large images
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>
#include <algorithm>
#include <cstring>

using namespace emscripten;

/**
 * Fast image resize using bilinear interpolation
 * Much faster than canvas-based resizing in JS
 */
class ImageProcessor {
private:
    std::vector<uint8_t> pixels;
    int width;
    int height;
    int channels;

    // Bilinear interpolation for smooth resizing
    uint8_t interpolate(float x, float y, int channel) {
        int x0 = static_cast<int>(x);
        int y0 = static_cast<int>(y);
        int x1 = std::min(x0 + 1, width - 1);
        int y1 = std::min(y0 + 1, height - 1);

        float dx = x - x0;
        float dy = y - y0;

        auto getPixel = [&](int px, int py) -> uint8_t {
            int idx = (py * width + px) * channels + channel;
            return pixels[idx];
        };

        float val = (1 - dx) * (1 - dy) * getPixel(x0, y0) +
                    dx * (1 - dy) * getPixel(x1, y0) +
                    (1 - dx) * dy * getPixel(x0, y1) +
                    dx * dy * getPixel(x1, y1);

        return static_cast<uint8_t>(std::round(val));
    }

public:
    ImageProcessor() : width(0), height(0), channels(4) {}

    /**
     * Load image data from JavaScript
     */
    void loadImage(const val& imageData, int w, int h) {
        width = w;
        height = h;
        channels = 4; // RGBA

        // Convert JavaScript Uint8Array to C++ vector
        unsigned int length = imageData["length"].as<unsigned int>();
        pixels.resize(length);

        val memory = val::module_property("HEAPU8");
        val memoryView = memory["buffer"];
        
        // Copy data from JS to C++
        for (unsigned int i = 0; i < length; i++) {
            pixels[i] = imageData[i].as<uint8_t>();
        }
    }

    /**
     * Resize image to target dimensions
     * Returns new image data as vector
     */
    std::vector<uint8_t> resize(int newWidth, int newHeight) {
        std::vector<uint8_t> result(newWidth * newHeight * channels);

        float xRatio = static_cast<float>(width) / newWidth;
        float yRatio = static_cast<float>(height) / newHeight;

        for (int y = 0; y < newHeight; y++) {
            for (int x = 0; x < newWidth; x++) {
                float srcX = x * xRatio;
                float srcY = y * yRatio;

                int dstIdx = (y * newWidth + x) * channels;
                
                for (int c = 0; c < channels; c++) {
                    result[dstIdx + c] = interpolate(srcX, srcY, c);
                }
            }
        }

        return result;
    }

    /**
     * Compress image by reducing quality (simple quantization)
     * Quality: 0-100 (100 = best quality)
     */
    std::vector<uint8_t> compress(int quality) {
        std::vector<uint8_t> result = pixels;
        
        if (quality >= 100) return result;
        
        // Simple color quantization for compression
        int levels = std::max(2, quality * 256 / 100);
        int step = 256 / levels;

        for (size_t i = 0; i < result.size(); i++) {
            if (i % channels == 3) continue; // Skip alpha channel
            
            int value = result[i];
            int quantized = (value / step) * step;
            result[i] = static_cast<uint8_t>(std::min(255, quantized));
        }

        return result;
    }

    /**
     * Smart crop to square (center-weighted)
     */
    std::vector<uint8_t> cropToSquare() {
        int size = std::min(width, height);
        int offsetX = (width - size) / 2;
        int offsetY = (height - size) / 2;

        std::vector<uint8_t> result(size * size * channels);

        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                int srcIdx = ((y + offsetY) * width + (x + offsetX)) * channels;
                int dstIdx = (y * size + x) * channels;
                
                for (int c = 0; c < channels; c++) {
                    result[dstIdx + c] = pixels[srcIdx + c];
                }
            }
        }

        return result;
    }

    /**
     * Apply grayscale filter
     */
    void applyGrayscale() {
        for (size_t i = 0; i < pixels.size(); i += channels) {
            uint8_t gray = static_cast<uint8_t>(
                0.299f * pixels[i] +     // Red
                0.587f * pixels[i + 1] + // Green
                0.114f * pixels[i + 2]   // Blue
            );
            pixels[i] = pixels[i + 1] = pixels[i + 2] = gray;
        }
    }

    /**
     * Adjust brightness (-100 to 100)
     */
    void adjustBrightness(int amount) {
        for (size_t i = 0; i < pixels.size(); i++) {
            if (i % channels == 3) continue; // Skip alpha
            
            int value = pixels[i] + amount;
            pixels[i] = static_cast<uint8_t>(std::max(0, std::min(255, value)));
        }
    }

    /**
     * Adjust contrast (0.0 to 2.0, 1.0 = normal)
     */
    void adjustContrast(float factor) {
        for (size_t i = 0; i < pixels.size(); i++) {
            if (i % channels == 3) continue; // Skip alpha
            
            float value = (pixels[i] - 128) * factor + 128;
            pixels[i] = static_cast<uint8_t>(std::max(0.0f, std::min(255.0f, value)));
        }
    }

    /**
     * Get processed image data for JavaScript
     */
    val getImageData() {
        return val(typed_memory_view(pixels.size(), pixels.data()));
    }

    int getWidth() const { return width; }
    int getHeight() const { return height; }
};

/**
 * Fast utility functions
 */
namespace ImageUtils {
    /**
     * Calculate optimal dimensions while maintaining aspect ratio
     */
    struct Dimensions {
        int width;
        int height;
    };

    Dimensions calculateOptimalSize(int originalWidth, int originalHeight, int maxSize) {
        if (originalWidth <= maxSize && originalHeight <= maxSize) {
            return {originalWidth, originalHeight};
        }

        float aspectRatio = static_cast<float>(originalWidth) / originalHeight;
        
        if (originalWidth > originalHeight) {
            return {maxSize, static_cast<int>(maxSize / aspectRatio)};
        } else {
            return {static_cast<int>(maxSize * aspectRatio), maxSize};
        }
    }

    /**
     * Calculate file size reduction estimate
     */
    int estimateCompressionSize(int originalSize, int quality) {
        return static_cast<int>(originalSize * (quality / 100.0));
    }
}

// Bind C++ classes and functions to JavaScript
EMSCRIPTEN_BINDINGS(image_processor) {
    class_<ImageProcessor>("ImageProcessor")
        .constructor<>()
        .function("loadImage", &ImageProcessor::loadImage)
        .function("resize", &ImageProcessor::resize)
        .function("compress", &ImageProcessor::compress)
        .function("cropToSquare", &ImageProcessor::cropToSquare)
        .function("applyGrayscale", &ImageProcessor::applyGrayscale)
        .function("adjustBrightness", &ImageProcessor::adjustBrightness)
        .function("adjustContrast", &ImageProcessor::adjustContrast)
        .function("getImageData", &ImageProcessor::getImageData)
        .function("getWidth", &ImageProcessor::getWidth)
        .function("getHeight", &ImageProcessor::getHeight);

    value_object<ImageUtils::Dimensions>("Dimensions")
        .field("width", &ImageUtils::Dimensions::width)
        .field("height", &ImageUtils::Dimensions::height);

    function("calculateOptimalSize", &ImageUtils::calculateOptimalSize);
    function("estimateCompressionSize", &ImageUtils::estimateCompressionSize);

    register_vector<uint8_t>("VectorUint8");
}
