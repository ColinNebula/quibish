import React, { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  lazy = true, 
  placeholder = null,
  onLoad = null,
  onError = null,
  ...props 
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState('');
  const imgRef = useRef(null);

  useEffect(() => {
    // Simple initialization without optimization service
    if (src) {
      setOptimizedSrc(src);
    }
  }, [src]);

  const handleLoad = (e) => {
    setLoaded(true);
    setError(false);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setError(true);
    setLoaded(false);
    if (onError) onError(e);
  };

  // Show placeholder while loading
  if (!loaded && placeholder) {
    return (
      <div 
        className={`image-placeholder ${className}`}
        style={{ width, height }}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={lazy ? undefined : optimizedSrc}
      data-src={lazy ? optimizedSrc : undefined}
      alt={alt}
      width={width}
      height={height}
      className={`optimized-image ${className} ${loaded ? 'loaded' : ''}`}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        transition: 'opacity 0.3s ease',
        opacity: loaded ? 1 : 0
      }}
      {...props}
    />
  );
};

export default OptimizedImage;