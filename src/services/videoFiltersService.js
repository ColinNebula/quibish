/**
 * Video Filters Service
 * 
 * Features:
 * - Beauty filters (smooth skin, brighten, enhance)
 * - Color adjustments (brightness, contrast, saturation, temperature)
 * - AR effects (face masks, accessories, backgrounds)
 * - Real-time canvas processing
 * - Filter presets
 */

class VideoFiltersService {
  constructor() {
    if (VideoFiltersService.instance) {
      return VideoFiltersService.instance;
    }

    this.canvas = null;
    this.ctx = null;
    this.videoElement = null;
    this.outputStream = null;
    this.animationFrame = null;

    // Filter state
    this.filters = {
      // Beauty filters
      smoothSkin: 0,        // 0-100
      brighten: 0,          // 0-100
      eyeEnhance: false,
      lipEnhance: false,
      slimFace: 0,          // 0-100
      
      // Color adjustments
      brightness: 0,        // -100 to 100
      contrast: 0,          // -100 to 100
      saturation: 0,        // -100 to 100
      temperature: 0,       // -100 to 100 (warm/cool)
      tint: 0,              // -100 to 100 (green/magenta)
      exposure: 0,          // -100 to 100
      highlights: 0,        // -100 to 100
      shadows: 0,           // -100 to 100
      vibrance: 0,          // 0-100
      
      // Effects
      blur: 0,              // 0-20
      sharpen: 0,           // 0-100
      vignette: 0,          // 0-100
      grain: 0,             // 0-100
      
      // AR Effects
      arEffect: 'none',     // 'none', 'glasses', 'hat', 'mask', 'ears'
      arColor: '#ffffff',
      
      // Preset
      preset: 'none'        // 'none', 'natural', 'vivid', 'dramatic', 'vintage', 'cool', 'warm'
    };

    // Filter presets
    this.presets = {
      none: {},
      natural: {
        smoothSkin: 30,
        brighten: 10,
        saturation: 5,
        vibrance: 10
      },
      vivid: {
        brightness: 10,
        contrast: 15,
        saturation: 30,
        vibrance: 25,
        sharpen: 20
      },
      dramatic: {
        contrast: 35,
        shadows: -20,
        highlights: 20,
        saturation: 20,
        vignette: 40
      },
      vintage: {
        saturation: -30,
        temperature: 20,
        grain: 30,
        vignette: 50,
        contrast: -10
      },
      cool: {
        temperature: -40,
        tint: 10,
        brightness: 5,
        saturation: 10
      },
      warm: {
        temperature: 40,
        brightness: 10,
        saturation: 15,
        smoothSkin: 20
      }
    };

    // Face detection (simplified - would use ML library in production)
    this.faceDetected = false;
    this.facePosition = null;

    VideoFiltersService.instance = this;
  }

  /**
   * Initialize filter service with video element
   */
  initialize(videoElement) {
    this.videoElement = videoElement;

    // Create canvas for processing
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    console.log('VideoFiltersService: Initialized');
    return true;
  }

  /**
   * Start processing video with filters
   */
  startProcessing() {
    if (!this.videoElement || !this.canvas) {
      console.error('Video filters not initialized');
      return null;
    }

    // Create output stream from canvas
    this.outputStream = this.canvas.captureStream(30);

    // Start rendering loop
    this.renderFrame();

    return this.outputStream;
  }

  /**
   * Stop processing
   */
  stopProcessing() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => track.stop());
      this.outputStream = null;
    }
  }

  /**
   * Render frame with filters
   */
  renderFrame() {
    if (!this.videoElement || this.videoElement.paused || this.videoElement.ended) {
      return;
    }

    // Draw video frame to canvas
    this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

    // Get image data
    let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Apply filters in order
    imageData = this.applyBeautyFilters(imageData);
    imageData = this.applyColorAdjustments(imageData);
    imageData = this.applyEffects(imageData);

    // Put processed image back
    this.ctx.putImageData(imageData, 0, 0);

    // Apply AR effects (canvas-based)
    this.applyAREffects();

    // Continue loop
    this.animationFrame = requestAnimationFrame(() => this.renderFrame());
  }

  /**
   * Apply beauty filters
   */
  applyBeautyFilters(imageData) {
    const data = imageData.data;

    // Smooth skin
    if (this.filters.smoothSkin > 0) {
      const radius = Math.floor(this.filters.smoothSkin / 20) + 1;
      imageData = this.applyGaussianBlur(imageData, radius);
    }

    // Brighten
    if (this.filters.brighten > 0) {
      const brightenAmount = this.filters.brighten * 1.5;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + brightenAmount);     // R
        data[i + 1] = Math.min(255, data[i + 1] + brightenAmount); // G
        data[i + 2] = Math.min(255, data[i + 2] + brightenAmount); // B
      }
    }

    return imageData;
  }

  /**
   * Apply color adjustments
   */
  applyColorAdjustments(imageData) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      if (this.filters.brightness !== 0) {
        const brightness = this.filters.brightness * 2.55;
        r = Math.max(0, Math.min(255, r + brightness));
        g = Math.max(0, Math.min(255, g + brightness));
        b = Math.max(0, Math.min(255, b + brightness));
      }

      // Contrast
      if (this.filters.contrast !== 0) {
        const factor = (259 * (this.filters.contrast + 255)) / (255 * (259 - this.filters.contrast));
        r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
        g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
        b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
      }

      // Saturation
      if (this.filters.saturation !== 0) {
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        const saturation = 1 + (this.filters.saturation / 100);
        r = Math.max(0, Math.min(255, gray + saturation * (r - gray)));
        g = Math.max(0, Math.min(255, gray + saturation * (g - gray)));
        b = Math.max(0, Math.min(255, gray + saturation * (b - gray)));
      }

      // Temperature (warm/cool)
      if (this.filters.temperature !== 0) {
        const temp = this.filters.temperature / 100;
        if (temp > 0) {
          // Warm
          r = Math.min(255, r + temp * 30);
          b = Math.max(0, b - temp * 30);
        } else {
          // Cool
          r = Math.max(0, r + temp * 30);
          b = Math.min(255, b - temp * 30);
        }
      }

      // Tint (green/magenta)
      if (this.filters.tint !== 0) {
        const tint = this.filters.tint / 100;
        if (tint > 0) {
          // Green
          g = Math.min(255, g + tint * 30);
        } else {
          // Magenta
          r = Math.min(255, r - tint * 15);
          b = Math.min(255, b - tint * 15);
          g = Math.max(0, g + tint * 30);
        }
      }

      // Exposure
      if (this.filters.exposure !== 0) {
        const exposure = Math.pow(2, this.filters.exposure / 100);
        r = Math.min(255, r * exposure);
        g = Math.min(255, g * exposure);
        b = Math.min(255, b * exposure);
      }

      // Vibrance (affects less saturated colors more)
      if (this.filters.vibrance !== 0) {
        const max = Math.max(r, g, b);
        const avg = (r + g + b) / 3;
        const amt = (this.filters.vibrance / 100) * (1 - max / 255) * (max - avg) / 128;
        r = Math.max(0, Math.min(255, r + (r - avg) * amt));
        g = Math.max(0, Math.min(255, g + (g - avg) * amt));
        b = Math.max(0, Math.min(255, b + (b - avg) * amt));
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    return imageData;
  }

  /**
   * Apply effects
   */
  applyEffects(imageData) {
    // Sharpen
    if (this.filters.sharpen > 0) {
      imageData = this.applySharpen(imageData, this.filters.sharpen / 100);
    }

    // Vignette
    if (this.filters.vignette > 0) {
      imageData = this.applyVignette(imageData, this.filters.vignette / 100);
    }

    // Grain
    if (this.filters.grain > 0) {
      imageData = this.applyGrain(imageData, this.filters.grain / 100);
    }

    return imageData;
  }

  /**
   * Apply Gaussian blur for smooth skin
   */
  applyGaussianBlur(imageData, radius) {
    // Simplified box blur (fast approximation)
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            const idx = (py * width + px) * 4;

            r += tempData[idx];
            g += tempData[idx + 1];
            b += tempData[idx + 2];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
      }
    }

    return imageData;
  }

  /**
   * Apply sharpen filter
   */
  applySharpen(imageData, amount) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);

    // Sharpen kernel
    const kernel = [
      0, -amount, 0,
      -amount, 1 + 4 * amount, -amount,
      0, -amount, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const w = kernel[(ky + 1) * 3 + (kx + 1)];
            r += tempData[idx] * w;
            g += tempData[idx + 1] * w;
            b += tempData[idx + 2] * w;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
      }
    }

    return imageData;
  }

  /**
   * Apply vignette effect
   */
  applyVignette(imageData, amount) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vignette = 1 - (dist / maxDist) * amount;

        const idx = (y * width + x) * 4;
        data[idx] *= vignette;
        data[idx + 1] *= vignette;
        data[idx + 2] *= vignette;
      }
    }

    return imageData;
  }

  /**
   * Apply film grain
   */
  applyGrain(imageData, amount) {
    const data = imageData.data;
    const intensity = amount * 50;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }

    return imageData;
  }

  /**
   * Apply AR effects (canvas-based overlays)
   */
  applyAREffects() {
    if (this.filters.arEffect === 'none') return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Simulate face detection (center of frame)
    const faceX = width / 2;
    const faceY = height / 2.5;
    const faceWidth = width / 4;
    const faceHeight = height / 3;

    this.ctx.save();

    switch (this.filters.arEffect) {
      case 'glasses':
        this.drawGlasses(faceX, faceY, faceWidth);
        break;
      case 'hat':
        this.drawHat(faceX, faceY, faceWidth);
        break;
      case 'mask':
        this.drawMask(faceX, faceY, faceWidth, faceHeight);
        break;
      case 'ears':
        this.drawEars(faceX, faceY, faceWidth, faceHeight);
        break;
      case 'mustache':
        this.drawMustache(faceX, faceY + faceHeight / 3, faceWidth);
        break;
    }

    this.ctx.restore();
  }

  /**
   * Draw glasses AR effect
   */
  drawGlasses(x, y, width) {
    const glassesWidth = width * 1.2;
    const glassesHeight = width / 3;
    const lensWidth = glassesWidth / 2.5;

    this.ctx.strokeStyle = this.filters.arColor;
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Left lens
    this.ctx.beginPath();
    this.ctx.roundRect(x - glassesWidth / 2 + 20, y - glassesHeight / 2, lensWidth, glassesHeight, 10);
    this.ctx.stroke();

    // Right lens
    this.ctx.beginPath();
    this.ctx.roundRect(x + glassesWidth / 2 - lensWidth - 20, y - glassesHeight / 2, lensWidth, glassesHeight, 10);
    this.ctx.stroke();

    // Bridge
    this.ctx.beginPath();
    this.ctx.moveTo(x - 20, y);
    this.ctx.lineTo(x + 20, y);
    this.ctx.stroke();

    // Semi-transparent lenses
    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - glassesWidth / 2 + 20, y - glassesHeight / 2, lensWidth, glassesHeight, 10);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.roundRect(x + glassesWidth / 2 - lensWidth - 20, y - glassesHeight / 2, lensWidth, glassesHeight, 10);
    this.ctx.fill();
  }

  /**
   * Draw hat AR effect
   */
  drawHat(x, y, width) {
    const hatWidth = width * 1.5;
    const hatHeight = width * 1.2;

    this.ctx.fillStyle = this.filters.arColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;

    // Hat top
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - hatHeight, hatWidth / 3, hatHeight / 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Hat brim
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - hatHeight / 2, hatWidth / 2, hatHeight / 8, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Draw mask AR effect
   */
  drawMask(x, y, width, height) {
    this.ctx.fillStyle = this.filters.arColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;

    // Mask shape (simplified)
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width / 1.8, height / 2.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Eye holes
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.ellipse(x - width / 4, y - height / 12, width / 8, height / 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 4, y - height / 12, width / 8, height / 10, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw ears AR effect
   */
  drawEars(x, y, width, height) {
    this.ctx.fillStyle = this.filters.arColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;

    // Left ear
    this.ctx.beginPath();
    this.ctx.ellipse(x - width / 1.5, y - height / 3, width / 4, height / 2.5, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Right ear
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 1.5, y - height / 3, width / 4, height / 2.5, 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Inner ear details
    this.ctx.fillStyle = 'rgba(255, 182, 193, 0.7)';
    this.ctx.beginPath();
    this.ctx.ellipse(x - width / 1.5, y - height / 3, width / 6, height / 4, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 1.5, y - height / 3, width / 6, height / 4, 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw mustache AR effect
   */
  drawMustache(x, y, width) {
    this.ctx.fillStyle = this.filters.arColor;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;

    // Mustache shape
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.bezierCurveTo(x - width / 3, y - width / 6, x - width / 2, y + width / 12, x - width / 1.5, y);
    this.ctx.bezierCurveTo(x - width / 1.5, y + width / 8, x - width / 4, y + width / 10, x, y + width / 20);
    this.ctx.bezierCurveTo(x + width / 4, y + width / 10, x + width / 1.5, y + width / 8, x + width / 1.5, y);
    this.ctx.bezierCurveTo(x + width / 2, y + width / 12, x + width / 3, y - width / 6, x, y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  /**
   * Set filter value
   */
  setFilter(filterName, value) {
    if (this.filters.hasOwnProperty(filterName)) {
      this.filters[filterName] = value;
      return true;
    }
    return false;
  }

  /**
   * Apply preset
   */
  applyPreset(presetName) {
    if (!this.presets[presetName]) return false;

    // Reset all filters
    this.resetFilters();

    // Apply preset
    const preset = this.presets[presetName];
    Object.keys(preset).forEach(key => {
      this.filters[key] = preset[key];
    });

    this.filters.preset = presetName;
    return true;
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    this.filters = {
      smoothSkin: 0,
      brighten: 0,
      eyeEnhance: false,
      lipEnhance: false,
      slimFace: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      vibrance: 0,
      blur: 0,
      sharpen: 0,
      vignette: 0,
      grain: 0,
      arEffect: 'none',
      arColor: '#ffffff',
      preset: 'none'
    };
  }

  /**
   * Get current filters
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * Get available presets
   */
  getPresets() {
    return Object.keys(this.presets);
  }

  /**
   * Get available AR effects
   */
  getAREffects() {
    return ['none', 'glasses', 'hat', 'mask', 'ears', 'mustache'];
  }
}

// Export singleton instance
const videoFiltersService = new VideoFiltersService();
export default videoFiltersService;
