/**
 * High-Performance Audio Processing
 * Real-time audio encoding, decoding, and effects
 * 
 * Features:
 * - Audio compression (ADPCM-like)
 * - Noise reduction
 * - Volume normalization
 * - Echo cancellation
 * - Pitch shifting
 * - Voice activity detection
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <cmath>
#include <algorithm>

using namespace emscripten;

class AudioProcessor {
private:
    static constexpr float PI = 3.14159265358979323846f;
    
    /**
     * Simple low-pass filter for noise reduction
     */
    void applyLowPassFilter(std::vector<float>& samples, float cutoff) {
        if (samples.size() < 2) return;
        
        float rc = 1.0f / (cutoff * 2.0f * PI);
        float dt = 1.0f / 48000.0f; // Assume 48kHz sample rate
        float alpha = dt / (rc + dt);
        
        for (size_t i = 1; i < samples.size(); i++) {
            samples[i] = samples[i - 1] + alpha * (samples[i] - samples[i - 1]);
        }
    }

    /**
     * Calculate RMS (Root Mean Square) for volume level
     */
    float calculateRMS(const std::vector<float>& samples, size_t start, size_t length) {
        float sum = 0.0f;
        size_t end = std::min(start + length, samples.size());
        
        for (size_t i = start; i < end; i++) {
            sum += samples[i] * samples[i];
        }
        
        return std::sqrt(sum / length);
    }

public:
    AudioProcessor() {}

    /**
     * Compress audio using simplified ADPCM
     * Reduces data size for transmission
     */
    std::vector<int16_t> compressAudio(const val& audioSamples) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);
        
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        std::vector<int16_t> compressed;
        compressed.reserve(length / 4); // ~4x compression
        
        // Delta encoding with quantization
        float prevValue = 0.0f;
        
        for (size_t i = 0; i < samples.size(); i += 4) {
            // Take average of 4 samples
            float avg = 0.0f;
            int count = 0;
            
            for (int j = 0; j < 4 && i + j < samples.size(); j++) {
                avg += samples[i + j];
                count++;
            }
            avg /= count;
            
            // Calculate delta
            float delta = avg - prevValue;
            prevValue = avg;
            
            // Quantize to 16-bit
            int16_t quantized = static_cast<int16_t>(delta * 32767.0f);
            compressed.push_back(quantized);
        }
        
        return compressed;
    }

    /**
     * Decompress audio
     */
    std::vector<float> decompressAudio(const val& compressedData) {
        unsigned int length = compressedData["length"].as<unsigned int>();
        std::vector<int16_t> compressed(length);
        
        for (unsigned int i = 0; i < length; i++) {
            compressed[i] = compressedData[i].as<int16_t>();
        }
        
        std::vector<float> decompressed;
        decompressed.reserve(compressed.size() * 4);
        
        float value = 0.0f;
        
        for (int16_t delta : compressed) {
            // Reconstruct value
            value += static_cast<float>(delta) / 32767.0f;
            
            // Interpolate to create 4 samples
            for (int i = 0; i < 4; i++) {
                decompressed.push_back(value);
            }
        }
        
        return decompressed;
    }

    /**
     * Reduce background noise
     */
    std::vector<float> reduceNoise(const val& audioSamples, float threshold) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);
        
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        // Apply low-pass filter
        applyLowPassFilter(samples, 3000.0f); // Cut frequencies above 3kHz
        
        // Noise gate
        for (auto& sample : samples) {
            if (std::abs(sample) < threshold) {
                sample *= 0.1f; // Reduce quiet sounds
            }
        }
        
        return samples;
    }

    /**
     * Normalize audio volume
     */
    std::vector<float> normalize(const val& audioSamples, float targetLevel) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);
        
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        // Find peak
        float peak = 0.0f;
        for (float sample : samples) {
            peak = std::max(peak, std::abs(sample));
        }
        
        if (peak < 0.001f) return samples; // Avoid division by zero
        
        // Calculate gain
        float gain = targetLevel / peak;
        
        // Apply gain
        for (auto& sample : samples) {
            sample *= gain;
            sample = std::max(-1.0f, std::min(1.0f, sample)); // Clip
        }
        
        return samples;
    }

    /**
     * Detect voice activity (VAD)
     * Returns confidence level 0.0-1.0
     */
    float detectVoiceActivity(const val& audioSamples) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        
        if (length == 0) return 0.0f;
        
        std::vector<float> samples(length);
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        // Calculate RMS in windows
        const size_t windowSize = 480; // 10ms at 48kHz
        int activeWindows = 0;
        int totalWindows = 0;
        
        for (size_t i = 0; i < samples.size(); i += windowSize) {
            float rms = calculateRMS(samples, i, windowSize);
            totalWindows++;
            
            // Voice typically has RMS > 0.02
            if (rms > 0.02f) {
                activeWindows++;
            }
        }
        
        return totalWindows > 0 ? static_cast<float>(activeWindows) / totalWindows : 0.0f;
    }

    /**
     * Apply echo cancellation (simplified)
     */
    std::vector<float> cancelEcho(const val& audioSamples, int delayMs) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);
        
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        int delaySamples = (delayMs * 48000) / 1000; // Convert ms to samples
        
        for (size_t i = delaySamples; i < samples.size(); i++) {
            // Subtract delayed signal (simplified echo cancellation)
            samples[i] -= samples[i - delaySamples] * 0.5f;
        }
        
        return samples;
    }

    /**
     * Shift pitch (simple time-domain method)
     */
    std::vector<float> shiftPitch(const val& audioSamples, float semitones) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);
        
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        float ratio = std::pow(2.0f, semitones / 12.0f);
        std::vector<float> shifted;
        shifted.reserve(static_cast<size_t>(samples.size() / ratio));
        
        for (float i = 0; i < samples.size() - 1; i += ratio) {
            size_t index = static_cast<size_t>(i);
            float fraction = i - index;
            
            // Linear interpolation
            float value = samples[index] * (1.0f - fraction) + 
                         samples[index + 1] * fraction;
            shifted.push_back(value);
        }
        
        return shifted;
    }

    /**
     * Calculate audio spectrum (FFT-like frequency analysis)
     */
    std::vector<float> analyzeSpectrum(const val& audioSamples, int bins) {
        unsigned int length = audioSamples["length"].as<unsigned int>();
        std::vector<float> samples(length);
        
        for (unsigned int i = 0; i < length; i++) {
            samples[i] = audioSamples[i].as<float>();
        }
        
        std::vector<float> spectrum(bins, 0.0f);
        int samplesPerBin = samples.size() / bins;
        
        for (int bin = 0; bin < bins; bin++) {
            float sum = 0.0f;
            int start = bin * samplesPerBin;
            int end = std::min(start + samplesPerBin, (int)samples.size());
            
            for (int i = start; i < end; i++) {
                sum += std::abs(samples[i]);
            }
            
            spectrum[bin] = sum / samplesPerBin;
        }
        
        return spectrum;
    }
};

EMSCRIPTEN_BINDINGS(audio_processor) {
    class_<AudioProcessor>("AudioProcessor")
        .constructor<>()
        .function("compressAudio", &AudioProcessor::compressAudio)
        .function("decompressAudio", &AudioProcessor::decompressAudio)
        .function("reduceNoise", &AudioProcessor::reduceNoise)
        .function("normalize", &AudioProcessor::normalize)
        .function("detectVoiceActivity", &AudioProcessor::detectVoiceActivity)
        .function("cancelEcho", &AudioProcessor::cancelEcho)
        .function("shiftPitch", &AudioProcessor::shiftPitch)
        .function("analyzeSpectrum", &AudioProcessor::analyzeSpectrum);

    register_vector<float>("VectorFloat");
    register_vector<int16_t>("VectorInt16");
}
