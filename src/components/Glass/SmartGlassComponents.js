import React, { useEffect, useRef, useState } from 'react';
import blurManager from '../../utils/blurEffectsManager';

/**
 * SmartGlassCard - Adaptive glassmorphism card component
 */
export const SmartGlassCard = ({ 
  children, 
  className = '', 
  intensity = 'medium',
  adaptive = true,
  animated = true,
  style = {},
  onClick,
  onHover,
  ...props 
}) => {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(intensity);

  useEffect(() => {
    if (cardRef.current && adaptive) {
      blurManager.createSmartGlass(cardRef.current, {
        intensity,
        adaptive: true,
        responsive: true,
        animated
      });
    }
  }, [intensity, adaptive, animated]);

  const handleMouseEnter = (e) => {
    setIsHovered(true);
    if (adaptive) {
      setBlurIntensity('strong');
      blurManager.applyBlurEffect(cardRef.current, 'strong', { animated: true });
    }
    onHover?.(e, true);
  };

  const handleMouseLeave = (e) => {
    setIsHovered(false);
    if (adaptive) {
      setBlurIntensity(intensity);
      blurManager.applyBlurEffect(cardRef.current, intensity, { animated: true });
    }
    onHover?.(e, false);
  };

  return (
    <div
      ref={cardRef}
      className={`smart-glass-card ${className} ${isHovered ? 'hovered' : ''}`}
      style={{
        position: 'relative',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        background: 'rgba(255, 255, 255, 0.12)',
        transition: animated ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * UltraPremiumCard - Ultra-premium glassmorphism card
 */
export const UltraPremiumCard = ({ 
  children, 
  className = '', 
  glowEffect = true,
  shimmerEffect = true,
  style = {},
  ...props 
}) => {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (cardRef.current) {
      blurManager.applyBlurEffect(cardRef.current, 'intense', {
        animated: true,
        adaptive: true,
        shadow: true
      });
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current || !glowEffect) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePos({ x, y });
    
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div
      ref={cardRef}
      className={`ultra-premium-card ${className}`}
      style={{
        position: 'relative',
        borderRadius: '24px',
        padding: '32px',
        background: `
          radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(255, 255, 255, 0.15), 
            transparent 40%),
          linear-gradient(135deg, 
            rgba(255, 255, 255, 0.25) 0%, 
            rgba(255, 255, 255, 0.05) 50%, 
            rgba(255, 255, 255, 0.15) 100%)
        `,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: `
          0 20px 60px rgba(0, 0, 0, 0.15),
          0 8px 32px rgba(0, 0, 0, 0.1),
          inset 0 2px 0 rgba(255, 255, 255, 0.4),
          inset 0 -1px 0 rgba(255, 255, 255, 0.2)
        `,
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {shimmerEffect && (
        <div
          className="shimmer-effect"
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            animation: 'shimmer 3s ease-in-out infinite',
            zIndex: 1
          }}
        />
      )}
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
      
      <style jsx>{`
        @keyframes shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        
        .ultra-premium-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.2),
            0 16px 48px rgba(0, 0, 0, 0.15),
            inset 0 2px 0 rgba(255, 255, 255, 0.5),
            inset 0 -1px 0 rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

/**
 * FloatingGlassCard - Floating glassmorphism card with parallax effect
 */
export const FloatingGlassCard = ({ 
  children, 
  className = '', 
  parallaxIntensity = 0.1,
  rotationIntensity = 0.05,
  style = {},
  ...props 
}) => {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('');

  useEffect(() => {
    if (cardRef.current) {
      blurManager.createSmartGlass(cardRef.current, {
        intensity: 'medium',
        adaptive: true,
        animated: true
      });
    }
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * parallaxIntensity;
    const deltaY = (e.clientY - centerY) * parallaxIntensity;
    
    const rotateX = (e.clientY - centerY) * rotationIntensity;
    const rotateY = (centerX - e.clientX) * rotationIntensity;
    
    setTransform(`
      translate3d(${deltaX}px, ${deltaY}px, 0) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg)
    `);
  };

  const handleMouseLeave = () => {
    setTransform('translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)');
  };

  return (
    <div
      ref={cardRef}
      className={`floating-glass-card ${className}`}
      style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '28px',
        background: 'rgba(255, 255, 255, 0.14)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        perspective: '1000px',
        ...style
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * LayeredGlassCard - Multi-layered glassmorphism effect
 */
export const LayeredGlassCard = ({ 
  children, 
  className = '', 
  layers = 3,
  style = {},
  ...props 
}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      blurManager.applyBlurEffect(cardRef.current, 'strong', {
        animated: true,
        adaptive: false
      });
    }
  }, []);

  const layerStyles = Array.from({ length: layers }, (_, index) => ({
    position: 'absolute',
    top: `${index * 2}px`,
    left: `${index * 2}px`,
    right: `${index * 2}px`,
    bottom: `${index * 2}px`,
    background: `rgba(255, 255, 255, ${0.08 + index * 0.04})`,
    borderRadius: `${20 - index * 2}px`,
    backdropFilter: `blur(${8 + index * 4}px)`,
    WebkitBackdropFilter: `blur(${8 + index * 4}px)`,
    border: `1px solid rgba(255, 255, 255, ${0.1 + index * 0.05})`,
    zIndex: layers - index
  }));

  return (
    <div
      ref={cardRef}
      className={`layered-glass-card ${className}`}
      style={{
        position: 'relative',
        borderRadius: '20px',
        minHeight: '200px',
        ...style
      }}
      {...props}
    >
      {layerStyles.map((layerStyle, index) => (
        <div key={index} style={layerStyle} />
      ))}
      
      <div 
        style={{ 
          position: 'relative', 
          zIndex: layers + 1, 
          padding: '32px' 
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * GlowingGlassCard - Glassmorphism card with animated glow effect
 */
export const GlowingGlassCard = ({ 
  children, 
  className = '', 
  glowColor = 'rgba(99, 102, 241, 0.5)',
  pulseAnimation = true,
  style = {},
  ...props 
}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      blurManager.createSmartGlass(cardRef.current, {
        intensity: 'medium',
        adaptive: true,
        animated: true
      });
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={`glowing-glass-card ${className} ${pulseAnimation ? 'pulse' : ''}`}
      style={{
        position: 'relative',
        borderRadius: '18px',
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: `
          0 8px 32px ${glowColor},
          0 4px 16px rgba(0, 0, 0, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.3)
        `,
        transition: 'all 0.3s ease',
        ...style
      }}
      {...props}
    >
      {children}
      
      <style jsx>{`
        .glowing-glass-card.pulse {
          animation: glowPulse 3s ease-in-out infinite;
        }
        
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 
              0 8px 32px ${glowColor},
              0 4px 16px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 
              0 12px 48px ${glowColor},
              0 6px 24px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
          }
        }
        
        .glowing-glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 16px 64px ${glowColor},
            0 8px 32px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
};