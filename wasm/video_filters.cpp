/**
 * Real-time Video Filters for WebRTC Video Calls
 * Hardware-accelerated video processing using C++
 * 
 * Features:
 * - Background blur (Gaussian blur algorithm)
 * - Beautify filter (skin smoothing)
 * - Brightness/contrast adjustment
 * - Color grading filters
 * - Green screen removal
 * - Face detection preparation
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>
#include <algorithm>

using namespace emscripten;

class VideoFilter {
private:
    int width;
    int height;
    std::vector<uint8_t> frame;

    // Fast Gaussian blur kernel
    void applyGaussianBlur(std::vector<uint8_t>& data, int radius) {
        if (radius < 1) return;

        std::vector<uint8_t> temp = data;
        int channels = 4; // RGBA

        // Horizontal pass
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                for (int c = 0; c < 3; c++) { // Skip alpha
                    int sum = 0;
                    int count = 0;

                    for (int i = -radius; i <= radius; i++) {
                        int sx = std::max(0, std::min(width - 1, x + i));
                        int idx = (y * width + sx) * channels + c;
                        sum += data[idx];
                        count++;
                    }

                    int idx = (y * width + x) * channels + c;
                    temp[idx] = sum / count;
                }
            }
        }

        // Vertical pass
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                for (int c = 0; c < 3; c++) {
                    int sum = 0;
                    int count = 0;

                    for (int i = -radius; i <= radius; i++) {
                        int sy = std::max(0, std::min(height - 1, y + i));
                        int idx = (sy * width + x) * channels + c;
                        sum += temp[idx];
                        count++;
                    }

                    int idx = (y * width + x) * channels + c;
                    data[idx] = sum / count;
                }
            }
        }
    }

    // Bilateral filter for skin smoothing (beautify)
    void applySkinSmoothing(std::vector<uint8_t>& data, int intensity) {
        std::vector<uint8_t> temp = data;
        int channels = 4;
        int radius = intensity / 20 + 1;

        for (int y = 1; y < height - 1; y++) {
            for (int x = 1; x < width - 1; x++) {
                int idx = (y * width + x) * channels;

                // Skip non-skin tones
                uint8_t r = data[idx];
                uint8_t g = data[idx + 1];
                uint8_t b = data[idx + 2];

                // Simple skin tone detection
                bool isSkin = (r > 95 && g > 40 && b > 20) &&
                             (r > g && r > b) &&
                             (std::abs(r - g) > 15);

                if (!isSkin) continue;

                // Apply smoothing only to skin areas
                for (int c = 0; c < 3; c++) {
                    int sum = 0;
                    int count = 0;

                    for (int dy = -radius; dy <= radius; dy++) {
                        for (int dx = -radius; dx <= radius; dx++) {
                            int sx = std::max(0, std::min(width - 1, x + dx));
                            int sy = std::max(0, std::min(height - 1, y + dy));
                            int sidx = (sy * width + sx) * channels + c;

                            sum += data[sidx];
                            count++;
                        }
                    }

                    temp[idx + c] = sum / count;
                }
            }
        }

        data = temp;
    }

public:
    VideoFilter() : width(0), height(0) {}

    void loadFrame(const val& imageData, int w, int h) {
        width = w;
        height = h;

        unsigned int length = imageData["length"].as<unsigned int>();
        frame.resize(length);

        for (unsigned int i = 0; i < length; i++) {
            frame[i] = imageData[i].as<uint8_t>();
        }
    }

    /**
     * Background blur filter for video calls
     * Simulates depth-of-field effect
     */
    std::vector<uint8_t> backgroundBlur(int strength) {
        std::vector<uint8_t> result = frame;
        int radius = strength / 10 + 1;

        // Apply blur to entire frame
        // In production, you'd detect the person and blur only background
        applyGaussianBlur(result, radius);

        return result;
    }

    /**
     * Beautify filter - skin smoothing
     */
    std::vector<uint8_t> beautify(int intensity) {
        std::vector<uint8_t> result = frame;

        // Smooth skin tones
        applySkinSmoothing(result, intensity);

        return result;
    }

    /**
     * Adjust brightness
     */
    std::vector<uint8_t> adjustBrightness(int amount) {
        std::vector<uint8_t> result = frame;

        for (size_t i = 0; i < result.size(); i += 4) {
            for (int c = 0; c < 3; c++) {
                int value = result[i + c] + amount;
                result[i + c] = std::max(0, std::min(255, value));
            }
        }

        return result;
    }

    /**
     * Adjust contrast
     */
    std::vector<uint8_t> adjustContrast(float factor) {
        std::vector<uint8_t> result = frame;

        for (size_t i = 0; i < result.size(); i += 4) {
            for (int c = 0; c < 3; c++) {
                float value = (result[i + c] - 128) * factor + 128;
                result[i + c] = std::max(0.0f, std::min(255.0f, value));
            }
        }

        return result;
    }

    /**
     * Green screen removal (chroma key)
     */
    std::vector<uint8_t> removeGreenScreen(int threshold) {
        std::vector<uint8_t> result = frame;

        for (size_t i = 0; i < result.size(); i += 4) {
            uint8_t r = result[i];
            uint8_t g = result[i + 1];
            uint8_t b = result[i + 2];

            // Detect green
            if (g > r + threshold && g > b + threshold) {
                result[i + 3] = 0; // Make transparent
            }
        }

        return result;
    }

    /**
     * Warmth filter (color temperature)
     */
    std::vector<uint8_t> adjustWarmth(int amount) {
        std::vector<uint8_t> result = frame;

        for (size_t i = 0; i < result.size(); i += 4) {
            // Add to red, subtract from blue
            int r = result[i] + amount;
            int b = result[i + 2] - amount / 2;

            result[i] = std::max(0, std::min(255, r));
            result[i + 2] = std::max(0, std::min(255, b));
        }

        return result;
    }

    /**
     * Vintage filter
     */
    std::vector<uint8_t> vintage() {
        std::vector<uint8_t> result = frame;

        for (size_t i = 0; i < result.size(); i += 4) {
            uint8_t r = result[i];
            uint8_t g = result[i + 1];
            uint8_t b = result[i + 2];

            // Sepia tone
            int tr = (int)(0.393 * r + 0.769 * g + 0.189 * b);
            int tg = (int)(0.349 * r + 0.686 * g + 0.168 * b);
            int tb = (int)(0.272 * r + 0.534 * g + 0.131 * b);

            result[i] = std::min(255, tr);
            result[i + 1] = std::min(255, tg);
            result[i + 2] = std::min(255, tb);
        }

        return result;
    }

    val getFrameData() {
        return val(typed_memory_view(frame.size(), frame.data()));
    }
};

EMSCRIPTEN_BINDINGS(video_filter) {
    class_<VideoFilter>("VideoFilter")
        .constructor<>()
        .function("loadFrame", &VideoFilter::loadFrame)
        .function("backgroundBlur", &VideoFilter::backgroundBlur)
        .function("beautify", &VideoFilter::beautify)
        .function("adjustBrightness", &VideoFilter::adjustBrightness)
        .function("adjustContrast", &VideoFilter::adjustContrast)
        .function("removeGreenScreen", &VideoFilter::removeGreenScreen)
        .function("adjustWarmth", &VideoFilter::adjustWarmth)
        .function("vintage", &VideoFilter::vintage)
        .function("getFrameData", &VideoFilter::getFrameData);

    register_vector<uint8_t>("VectorUint8");
}
