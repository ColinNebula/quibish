/**
 * Real-time Video Filter Service for WebRTC Calls
 * Uses WebAssembly for hardware-accelerated video processing
 */

class VideoFilterService {
  constructor() {
    this.module = null;
    this.isReady = false;
    this.currentFilter = null;
  }

  async initialize() {
    if (this.isReady) return;

    try {
      const createModule = await import('/wasm/video_filters.js');
      this.module = await createModule.default();
      this.isReady = true;
      console.log('✅ Video Filter module loaded');
    } catch (error) {
      console.warn('⚠️ Video filters unavailable:', error);
    }
  }

  /**
   * Apply filter to video frame
   * @param {ImageData} frameData - Video frame from canvas
   * @param {string} filterType - Type of filter to apply
   * @param {object} options - Filter options
   */
  async applyFilter(frameData, filterType = 'none', options = {}) {
    if (!this.isReady) await this.initialize();
    if (!this.module) return frameData;

    try {
      const { data, width, height } = frameData;
      const filter = new this.module.VideoFilter();
      
      // Load frame into C++
      const uint8Array = new Uint8Array(data.buffer);
      filter.loadFrame(uint8Array, width, height);

      // Apply requested filter
      let filteredData;
      switch (filterType) {
        case 'backgroundBlur':
          filteredData = filter.backgroundBlur(options.strength || 50);
          break;
        
        case 'beautify':
          filteredData = filter.beautify(options.intensity || 50);
          break;
        
        case 'brightness':
          filteredData = filter.adjustBrightness(options.amount || 0);
          break;
        
        case 'contrast':
          filteredData = filter.adjustContrast(options.factor || 1.0);
          break;
        
        case 'greenScreen':
          filteredData = filter.removeGreenScreen(options.threshold || 30);
          break;
        
        case 'warmth':
          filteredData = filter.adjustWarmth(options.amount || 0);
          break;
        
        case 'vintage':
          filteredData = filter.vintage();
          break;
        
        default:
          return frameData;
      }

      // Convert back to ImageData
      return new ImageData(
        new Uint8ClampedArray(filteredData),
        width,
        height
      );

    } catch (error) {
      console.error('Filter application error:', error);
      return frameData;
    }
  }

  /**
   * Process video stream with filter
   * For use with WebRTC MediaStream
   */
  createFilteredStream(sourceStream, filterType, options) {
    const video = document.createElement('video');
    video.srcObject = sourceStream;
    video.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const processFrame = async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0);
        const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const filtered = await this.applyFilter(frameData, filterType, options);
        ctx.putImageData(filtered, 0, 0);
      }
      
      requestAnimationFrame(processFrame);
    };

    processFrame();

    return canvas.captureStream(30); // 30 FPS
  }
}

export default new VideoFilterService();
