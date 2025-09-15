/**
 * Enhanced media processing utilities
 */

/**
 * Image optimization and processing utilities
 */
export const imageUtils = {
  // Compress and resize image for better upload and display
  async optimizeImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
    return new Promise((resolve, reject) => {
      // Skip optimization for small files (less than 200KB)
      if (file.size < 200 * 1024) {
        return resolve(file);
      }
      
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const img = new Image();
        
        img.onload = function() {
          try {
            // Determine if resizing is needed
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
              const aspectRatio = width / height;
              
              if (width > height) {
                width = maxWidth;
                height = Math.round(width / aspectRatio);
              } else {
                height = maxHeight;
                width = Math.round(height * aspectRatio);
              }
            }
            
            // Create canvas for resizing
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            // Draw the resized image on the canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob with specified quality
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Canvas to Blob conversion failed'));
                  return;
                }
                
                // Create a new file from the blob
                const optimizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: new Date().getTime(),
                });
                
                // Compare sizes and use the smaller one
                if (optimizedFile.size < file.size) {
                  console.log(`Image optimized: ${Math.round(file.size / 1024)}KB → ${Math.round(optimizedFile.size / 1024)}KB`);
                  resolve(optimizedFile);
                } else {
                  // If optimization didn't reduce size, use the original
                  console.log('Optimization did not reduce file size, using original.');
                  resolve(file);
                }
              },
              'image/jpeg',
              quality
            );
          } catch (err) {
            console.error('Error during image optimization:', err);
            resolve(file); // Return original on error
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = event.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  },

  // Convert HEIC/HEIF to JPEG
  async convertHeicToJpeg(file) {
    // Only process HEIC/HEIF files
    if (!file.type.includes('heic') && !file.type.includes('heif')) {
      return file;
    }
    
    try {
      // In a real implementation, you would include the heic2any library
      console.log('Converting HEIC/HEIF image to JPEG');
      
      // Placeholder for actual conversion
      // In production, you would use:
      // const jpegBlob = await heic2any({
      //   blob: file,
      //   toType: 'image/jpeg',
      //   quality: 0.85
      // });
      // return new File([jpegBlob], file.name.replace(/\.heic$/i, '.jpg'), {
      //   type: 'image/jpeg',
      //   lastModified: file.lastModified
      // });
      
      return file; // Return original file until actual implementation
    } catch (error) {
      console.error('Error converting HEIC/HEIF to JPEG:', error);
      return file; // Return original file on error
    }
  },

  // Apply filters to image
  async applyFilter(file, filter) {
    if (!filter || filter === 'none') {
      return file;
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const img = new Image();
        
        img.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            
            // Apply filter using CSS filter
            ctx.filter = getFilterCss(filter);
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Canvas to Blob conversion failed'));
                  return;
                }
                
                // Create a new file from the blob
                const filteredFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: new Date().getTime(),
                });
                
                resolve(filteredFile);
              },
              'image/jpeg',
              0.85
            );
          } catch (err) {
            console.error('Error applying filter:', err);
            resolve(file); // Return original on error
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = event.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  },
  
  // Get image dimensions
  async getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const img = new Image();
        
        img.onload = function() {
          resolve({
            width: img.width,
            height: img.height,
            aspectRatio: (img.width / img.height).toFixed(2)
          });
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = event.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  },
  
  // Get image data URL for backup storage
  async getImageDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(event) {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file as data URL'));
      };
      
      reader.readAsDataURL(file);
    });
  }
};

/**
 * Video processing utilities
 */
export const videoUtils = {
  // Process video for upload
  async processVideo(file, maxDurationSecs = 60) {
    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(file);
      
      // Check duration
      const isValidDuration = metadata.duration <= maxDurationSecs;
      const exceededBy = isValidDuration ? 0 : Math.round(metadata.duration - maxDurationSecs);
      
      // Format duration string
      const formattedDuration = this.formatDuration(metadata.duration);
      
      // Define common video formats that are widely supported
      const widelySupported = ['video/mp4', 'video/webm'];
      
      // Check if video is already in a widely supported format
      const needsConversion = !widelySupported.includes(file.type);
      
      // Calculate file size in MB
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      
      return {
        file,
        duration: metadata.duration,
        formattedDuration,
        isValid: isValidDuration,
        exceededBy,
        needsConversion,
        dimensions: `${metadata.width}x${metadata.height}`,
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.aspectRatio,
        fileSize: file.size,
        fileSizeMB
      };
    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  },
  
  // Get video metadata
  async getVideoMetadata(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        
        // Calculate aspect ratio
        const aspectRatio = (video.videoWidth / video.videoHeight).toFixed(2);
        
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Error loading video metadata'));
      };
      
      // Set a timeout in case the metadata doesn't load
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Video metadata loading timed out'));
      }, 5000);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        
        // Calculate aspect ratio
        const aspectRatio = (video.videoWidth / video.videoHeight).toFixed(2);
        
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio
        });
      };
      
      video.src = URL.createObjectURL(file);
    });
  },
  
  // Format duration to MM:SS
  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  // Generate a video thumbnail
  async generateThumbnail(file, seekTime = 1.5) {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.playsInline = true;
        video.muted = true;
        
        video.onloadedmetadata = () => {
          // Seek to the desired time
          video.currentTime = Math.min(seekTime, video.duration / 3);
          
          video.onseeked = () => {
            try {
              // Create canvas and draw video frame
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              
              const ctx = canvas.getContext('2d');
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // Convert to data URL
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              
              URL.revokeObjectURL(video.src);
              resolve(dataUrl);
            } catch (err) {
              console.error('Error generating thumbnail:', err);
              URL.revokeObjectURL(video.src);
              reject(err);
            }
          };
          
          video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Error loading video for thumbnail generation'));
          };
        };
        
        video.src = URL.createObjectURL(file);
        
        // Set a timeout in case seeking doesn't complete
        setTimeout(() => {
          if (!video.src) return;
          URL.revokeObjectURL(video.src);
          reject(new Error('Video thumbnail generation timed out'));
        }, 8000);
      } catch (err) {
        reject(err);
      }
    });
  }
};

// Helper function to get CSS filter string
function getFilterCss(filter) {
  switch (filter) {
    case 'grayscale': return 'grayscale(100%)';
    case 'sepia': return 'sepia(70%)';
    case 'vintage': return 'sepia(30%) contrast(110%) brightness(110%) saturate(85%)';
    case 'blur': return 'blur(1px)';
    case 'brightness': return 'brightness(120%)';
    case 'contrast': return 'contrast(120%)';
    case 'saturate': return 'saturate(150%)';
    default: return 'none';
  }
}
