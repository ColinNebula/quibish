/**
 * Advanced Media Processing
 * 
 * Features:
 * - Video thumbnail generation
 * - Audio waveform generation
 * - File compression
 * - Format conversion
 * - Metadata extraction
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>
#include <algorithm>

using namespace emscripten;

class MediaProcessor {
private:
    /**
     * Generate color-coded waveform data
     */
    std::vector<int> generateColoredWaveform(const std::vector<float>& samples,
                                             int width, int height) {
        std::vector<int> waveform(width * height * 4, 0); // RGBA
        
        int samplesPerBar = samples.size() / width;
        if (samplesPerBar < 1) samplesPerBar = 1;

        for (int x = 0; x < width; x++) {
            // Find peak amplitude in this segment
            float maxAmplitude = 0;
            int startIdx = x * samplesPerBar;
            int endIdx = std::min(startIdx + samplesPerBar, (int)samples.size());

            for (int i = startIdx; i < endIdx; i++) {
                maxAmplitude = std::max(maxAmplitude, std::abs(samples[i]));
            }

            // Calculate bar height
            int barHeight = (int)(maxAmplitude * height / 2);
            int centerY = height / 2;

            // Draw waveform bar with gradient color
            for (int y = centerY - barHeight; y < centerY + barHeight; y++) {
                if (y < 0 || y >= height) continue;

                int idx = (y * width + x) * 4;
                
                // Gradient from blue (low) to red (high)
                float intensity = (float)barHeight / (height / 2);
                int r = (int)(intensity * 255);
                int g = (int)((1 - intensity) * 128);
                int b = (int)((1 - intensity) * 255);

                waveform[idx] = r;
                waveform[idx + 1] = g;
                waveform[idx + 2] = b;
                waveform[idx + 3] = 255; // Alpha
            }
        }

        return waveform;
    }

public:
    MediaProcessor() {}

    /**
     * Generate waveform visualization from audio samples
     */
    std::vector<int> generateWaveform(const val& audioSamples, int width, int height) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);

        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }

        return generateColoredWaveform(samples, width, height);
    }

    /**
     * Extract key frames from video data (simplified)
     */
    std::vector<uint8_t> extractKeyFrame(const val& videoFrame, int width, int height,
                                         int targetWidth, int targetHeight) {
        std::vector<uint8_t> frame(width * height * 4);
        unsigned int length = videoFrame["length"].as<unsigned int>();

        for (unsigned int i = 0; i < length && i < frame.size(); i++) {
            frame[i] = videoFrame[i].as<uint8_t>();
        }

        // Simple resize for thumbnail
        std::vector<uint8_t> thumbnail(targetWidth * targetHeight * 4);
        float xRatio = (float)width / targetWidth;
        float yRatio = (float)height / targetHeight;

        for (int y = 0; y < targetHeight; y++) {
            for (int x = 0; x < targetWidth; x++) {
                int srcX = (int)(x * xRatio);
                int srcY = (int)(y * yRatio);
                
                int srcIdx = (srcY * width + srcX) * 4;
                int dstIdx = (y * targetWidth + x) * 4;

                for (int c = 0; c < 4; c++) {
                    thumbnail[dstIdx + c] = frame[srcIdx + c];
                }
            }
        }

        return thumbnail;
    }

    /**
     * Simple data compression using Run-Length Encoding
     */
    std::vector<uint8_t> compress(const val& data) {
        unsigned int length = data["length"].as<unsigned int>();
        std::vector<uint8_t> input(length);
        
        for (unsigned int i = 0; i < length; i++) {
            input[i] = data[i].as<uint8_t>();
        }

        std::vector<uint8_t> compressed;
        compressed.reserve(length);

        for (size_t i = 0; i < input.size(); ) {
            uint8_t value = input[i];
            uint8_t count = 1;

            // Count consecutive same values (max 255)
            while (i + count < input.size() && 
                   input[i + count] == value && 
                   count < 255) {
                count++;
            }

            compressed.push_back(count);
            compressed.push_back(value);
            i += count;
        }

        return compressed;
    }

    /**
     * Decompress RLE data
     */
    std::vector<uint8_t> decompress(const val& compressedData) {
        unsigned int length = compressedData["length"].as<unsigned int>();
        std::vector<uint8_t> input(length);
        
        for (unsigned int i = 0; i < length; i++) {
            input[i] = compressedData[i].as<uint8_t>();
        }

        std::vector<uint8_t> decompressed;

        for (size_t i = 0; i < input.size(); i += 2) {
            uint8_t count = input[i];
            uint8_t value = input[i + 1];

            for (uint8_t j = 0; j < count; j++) {
                decompressed.push_back(value);
            }
        }

        return decompressed;
    }

    /**
     * Calculate audio volume levels
     */
    float calculateVolume(const val& audioSamples) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        
        float sum = 0;
        for (unsigned int i = 0; i < length; i++) {
            float sample = audioSamples[i].as<float>();
            sum += std::abs(sample);
        }

        return sum / length;
    }

    /**
     * Detect silence in audio
     */
    bool detectSilence(const val& audioSamples, float threshold) {
        return calculateVolume(audioSamples) < threshold;
    }
};

EMSCRIPTEN_BINDINGS(media_processor) {
    class_<MediaProcessor>("MediaProcessor")
        .constructor<>()
        .function("generateWaveform", &MediaProcessor::generateWaveform)
        .function("extractKeyFrame", &MediaProcessor::extractKeyFrame)
        .function("compress", &MediaProcessor::compress)
        .function("decompress", &MediaProcessor::decompress)
        .function("calculateVolume", &MediaProcessor::calculateVolume)
        .function("detectSilence", &MediaProcessor::detectSilence);

    register_vector<int>("VectorInt");
    register_vector<uint8_t>("VectorUint8");
}
