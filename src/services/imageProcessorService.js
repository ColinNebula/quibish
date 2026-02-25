/**
 * JavaScript wrapper for C++ WebAssembly Image Processor
 * Provides easy-to-use API for image optimization in React
 */

class ImageProcessorService {
  constructor() {
    this.module = null;
    this.isReady = false;
    this.initPromise = null;
  }

  /**
   * Initialize the WebAssembly module
   */
  async initialize() {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Load the WebAssembly module from public folder
        // Note: WASM files should be served statically from public/wasm/
        // Temporarily disabled - using fallback image processing
        console.warn('⚠️ WebAssembly Image Processor not available, using fallback');
        this.isReady = false;
        // const createModule = await import(`${process.env.PUBLIC_URL}/wasm/image_processor.js`);
        // this.module = await createModule.default();
        // this.isReady = true;
        // console.log('✅ Image Processor WebAssembly module loaded');
      } catch (error) {
        console.error('❌ Failed to load Image Processor:', error);
        // Don't throw - allow app to continue without WASM optimization
      }
    })();

    return this.initPromise;
  }

  /**
   * Ensure module is loaded before operations
   */
  async ensureReady() {
    if (!this.isReady) {
      await this.initialize();
    }
  }

  /**
   * Process image from File or Blob
   * @param {File|Blob} file - Input image file
   * @param {Object} options - Processing options
   * @returns {Promise<Blob>} - Processed image as Blob
   */
  async processImage(file, options = {}) {
    await this.ensureReady();

    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 85,
      format = 'image/jpeg',
      cropToSquare = false,
      filters = {}
    } = options;

    try {
      // Load image to get dimensions
      const imageData = await this.loadImageFromFile(file);
      const { data, width, height } = imageData;

      // Create processor instance
      const processor = new this.module.ImageProcessor();

      // Load image data into C++ processor
      const uint8Array = new Uint8Array(data.buffer);
      processor.loadImage(uint8Array, width, height);

      // Apply filters
      if (filters.grayscale) {
        processor.applyGrayscale();
      }
      if (filters.brightness !== undefined) {
        processor.adjustBrightness(filters.brightness);
      }
      if (filters.contrast !== undefined) {
        processor.adjustContrast(filters.contrast);
      }

      // Crop to square if requested
      let processedData;
      let finalWidth = width;
      let finalHeight = height;

      if (cropToSquare) {
        processedData = processor.cropToSquare();
        const size = Math.min(width, height);
        finalWidth = finalHeight = size;
      }

      // Calculate optimal dimensions
      const dims = this.module.calculateOptimalSize(
        finalWidth,
        finalHeight,
        Math.max(maxWidth, maxHeight)
      );

      // Resize if needed
      if (dims.width !== finalWidth || dims.height !== finalHeight) {
        processedData = processor.resize(dims.width, dims.height);
        finalWidth = dims.width;
        finalHeight = dims.height;
      } else if (!processedData) {
        processedData = processor.getImageData();
      }

      // Compress
      if (quality < 100) {
        processedData = processor.compress(quality);
      }

      // Convert back to canvas and then to Blob
      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');

      const imageDataObj = new ImageData(
        new Uint8ClampedArray(processedData),
        finalWidth,
        finalHeight
      );
      ctx.putImageData(imageDataObj, 0, 0);

      // Return as Blob
      return new Promise((resolve) => {
        canvas.toBlob(resolve, format, quality / 100);
      });

    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  /**
   * Optimize avatar image (square, 512x512)
   */
  async optimizeAvatar(file) {
    return this.processImage(file, {
      maxWidth: 512,
      maxHeight: 512,
      quality: 90,
      cropToSquare: true,
      format: 'image/jpeg'
    });
  }

  /**
   * Optimize chat image (max 1920x1920)
   */
  async optimizeChatImage(file) {
    return this.processImage(file, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'image/jpeg'
    });
  }

  /**
   * Create thumbnail (small preview)
   */
  async createThumbnail(file, size = 200) {
    return this.processImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 75,
      cropToSquare: true,
      format: 'image/jpeg'
    });
  }

  /**
   * Load image from File/Blob into ImageData
   */
  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        URL.revokeObjectURL(url);

        resolve({
          data: imageData.data,
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Estimate size reduction
   */
  estimateSizeReduction(originalSize, quality) {
    return this.module.estimateCompressionSize(originalSize, quality);
  }
}

// Export singleton instance
export default new ImageProcessorService();
