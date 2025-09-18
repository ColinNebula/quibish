// Dynamic Theme and Background Service
class DynamicThemeService {
  constructor() {
    this.currentTheme = 'default';
    this.backgroundType = 'static';
    this.seasonalThemes = this.getSeasonalThemes();
    this.customThemes = new Map();
    this.backgroundAnimations = new Map();
    
    this.init();
  }

  init() {
    // Auto-detect season and apply appropriate theme
    this.detectAndApplySeason();
    
    // Listen for time-based theme changes
    this.setupTimeBasedThemes();
    
    // Initialize background effects
    this.initBackgroundEffects();
  }

  // Get seasonal themes based on current date
  getSeasonalThemes() {
    return {
      spring: {
        name: 'Spring Bloom',
        colors: {
          primary: '#10b981',
          secondary: '#34d399',
          accent: '#f59e0b',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
          particles: ['🌸', '🌱', '🦋', '🌿']
        },
        effects: ['floating-petals', 'gentle-breeze']
      },
      summer: {
        name: 'Summer Vibes',
        colors: {
          primary: '#3b82f6',
          secondary: '#60a5fa',
          accent: '#f59e0b',
          background: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #60a5fa 100%)',
          particles: ['☀️', '🌊', '🏖️', '🌞']
        },
        effects: ['sun-rays', 'wave-motion']
      },
      autumn: {
        name: 'Autumn Leaves',
        colors: {
          primary: '#f59e0b',
          secondary: '#fb923c',
          accent: '#dc2626',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fdba74 100%)',
          particles: ['🍂', '🍁', '🌰', '🍄']
        },
        effects: ['falling-leaves', 'wind-rustle']
      },
      winter: {
        name: 'Winter Wonder',
        colors: {
          primary: '#6366f1',
          secondary: '#818cf8',
          accent: '#06b6d4',
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
          particles: ['❄️', '⭐', '🌨️', '✨']
        },
        effects: ['snowfall', 'twinkling-stars']
      }
    };
  }

  // Detect current season and apply theme
  detectAndApplySeason() {
    const now = new Date();
    const month = now.getMonth();
    let season;

    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    const savedTheme = localStorage.getItem('quibish-theme-preference');
    if (savedTheme && savedTheme !== 'auto') {
      this.applyTheme(savedTheme);
    } else {
      this.applySeasonalTheme(season);
    }
  }

  // Apply seasonal theme
  applySeasonalTheme(season) {
    const theme = this.seasonalThemes[season];
    if (!theme) return;

    this.currentTheme = season;
    this.updateCSSVariables(theme.colors);
    this.setBackground(theme.colors.background);
    this.updateParticles(theme.colors.particles);
    this.applyEffects(theme.effects);

    console.log(`🎨 Applied ${theme.name} theme`);
  }

  // Apply custom theme
  applyTheme(themeName) {
    if (this.seasonalThemes[themeName]) {
      this.applySeasonalTheme(themeName);
    } else if (this.customThemes.has(themeName)) {
      const theme = this.customThemes.get(themeName);
      this.updateCSSVariables(theme.colors);
      this.setBackground(theme.background);
    }
    
    localStorage.setItem('quibish-theme-preference', themeName);
  }

  // Update CSS custom properties
  updateCSSVariables(colors) {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      if (key !== 'background' && key !== 'particles') {
        root.style.setProperty(`--theme-${key}`, value);
      }
    });
  }

  // Set dynamic background
  setBackground(background) {
    const appElement = document.querySelector('.app');
    if (appElement) {
      appElement.style.background = background;
      appElement.style.transition = 'background 1s ease-in-out';
    }
  }

  // Initialize background effects
  initBackgroundEffects() {
    this.createParticleSystem();
    this.createAnimatedShapes();
  }

  // Create particle system
  createParticleSystem() {
    const container = document.createElement('div');
    container.className = 'dynamic-particles';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;

    document.body.appendChild(container);
    this.particleContainer = container;
  }

  // Update particles based on theme
  updateParticles(particles) {
    if (!this.particleContainer) return;

    // Clear existing particles
    this.particleContainer.innerHTML = '';

    // Add new themed particles
    for (let i = 0; i < 20; i++) {
      const particle = this.createParticle(particles);
      this.particleContainer.appendChild(particle);
    }
  }

  createParticle(particles) {
    const particle = document.createElement('div');
    const emoji = particles[Math.floor(Math.random() * particles.length)];
    const size = Math.random() * 20 + 10;
    const left = Math.random() * 100;
    const duration = Math.random() * 10 + 15;
    const delay = Math.random() * 5;

    particle.textContent = emoji;
    particle.style.cssText = `
      position: absolute;
      font-size: ${size}px;
      left: ${left}%;
      top: -50px;
      animation: particleFall ${duration}s linear infinite;
      animation-delay: ${delay}s;
      opacity: 0.7;
    `;

    return particle;
  }

  // Create animated background shapes
  createAnimatedShapes() {
    const shapesContainer = document.createElement('div');
    shapesContainer.className = 'animated-shapes';
    shapesContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -2;
      overflow: hidden;
    `;

    // Create floating geometric shapes
    for (let i = 0; i < 5; i++) {
      const shape = this.createAnimatedShape();
      shapesContainer.appendChild(shape);
    }

    document.body.appendChild(shapesContainer);
  }

  createAnimatedShape() {
    const shape = document.createElement('div');
    const size = Math.random() * 100 + 50;
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const rotation = Math.random() * 360;
    const duration = Math.random() * 20 + 10;

    const shapeType = Math.random();
    let borderRadius = '0';
    
    if (shapeType < 0.33) {
      borderRadius = '50%'; // Circle
    } else if (shapeType < 0.66) {
      borderRadius = '25%'; // Rounded square
    }
    // else rectangle

    shape.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      top: ${top}%;
      background: linear-gradient(45deg, 
        rgba(99, 102, 241, 0.1), 
        rgba(139, 92, 246, 0.1));
      border-radius: ${borderRadius};
      transform: rotate(${rotation}deg);
      animation: floatShape ${duration}s ease-in-out infinite;
      opacity: 0.3;
    `;

    return shape;
  }

  // Apply visual effects
  applyEffects(effects) {
    effects.forEach(effect => {
      switch (effect) {
        case 'floating-petals':
          this.createFloatingPetals();
          break;
        case 'snowfall':
          this.createSnowfall();
          break;
        case 'sun-rays':
          this.createSunRays();
          break;
        case 'falling-leaves':
          this.createFallingLeaves();
          break;
      }
    });
  }

  createFloatingPetals() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes petalFloat {
        0% { transform: translateY(100vh) rotateZ(0deg); }
        100% { transform: translateY(-100px) rotateZ(360deg); }
      }
      .petal-particle {
        animation: petalFloat 8s linear infinite !important;
      }
    `;
    document.head.appendChild(style);
  }

  createSnowfall() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes snowfall {
        0% { transform: translateY(-100px) translateX(0px); }
        100% { transform: translateY(100vh) translateX(100px); }
      }
      .snow-particle {
        animation: snowfall 6s linear infinite !important;
      }
    `;
    document.head.appendChild(style);
  }

  createSunRays() {
    const rays = document.createElement('div');
    rays.className = 'sun-rays';
    rays.style.cssText = `
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(
        circle at 70% 20%, 
        rgba(251, 191, 36, 0.1) 0%, 
        transparent 50%
      );
      animation: sunRotate 30s linear infinite;
      pointer-events: none;
      z-index: -1;
    `;

    document.body.appendChild(rays);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes sunRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  createFallingLeaves() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes leafFall {
        0% { 
          transform: translateY(-100px) rotateZ(0deg) translateX(0px);
          opacity: 1;
        }
        50% { 
          transform: translateY(50vh) rotateZ(180deg) translateX(50px);
          opacity: 0.8;
        }
        100% { 
          transform: translateY(100vh) rotateZ(360deg) translateX(-50px);
          opacity: 0;
        }
      }
      .leaf-particle {
        animation: leafFall 10s ease-in-out infinite !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Setup time-based theme changes
  setupTimeBasedThemes() {
    setInterval(() => {
      const hour = new Date().getHours();
      
      // Auto dark mode at night (if enabled)
      if (localStorage.getItem('quibish-auto-dark') === 'true') {
        if (hour >= 20 || hour <= 6) {
          this.enableDarkMode();
        } else {
          this.disableDarkMode();
        }
      }
    }, 60000); // Check every minute
  }

  // Dark mode toggle
  enableDarkMode() {
    document.body.classList.add('dark-theme');
    const root = document.documentElement;
    root.style.setProperty('--theme-background', 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)');
  }

  disableDarkMode() {
    document.body.classList.remove('dark-theme');
    this.detectAndApplySeason(); // Restore original theme
  }

  // Create custom theme
  createCustomTheme(name, colors, background) {
    this.customThemes.set(name, {
      colors,
      background
    });
    localStorage.setItem(`quibish-custom-theme-${name}`, JSON.stringify({ colors, background }));
  }

  // Get available themes
  getAvailableThemes() {
    return {
      seasonal: Object.keys(this.seasonalThemes).map(key => ({
        id: key,
        name: this.seasonalThemes[key].name,
        preview: this.seasonalThemes[key].colors.background
      })),
      custom: Array.from(this.customThemes.keys()).map(key => ({
        id: key,
        name: key,
        preview: this.customThemes.get(key).background
      }))
    };
  }

  // Add CSS animations
  addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes particleFall {
        0% {
          transform: translateY(-100px) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0;
        }
      }

      @keyframes floatShape {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
        }
        33% {
          transform: translateY(-20px) rotate(120deg);
        }
        66% {
          transform: translateY(10px) rotate(240deg);
        }
      }

      .dynamic-particles {
        transition: opacity 0.5s ease;
      }

      .animated-shapes {
        transition: opacity 0.5s ease;
      }

      @media (prefers-reduced-motion: reduce) {
        .dynamic-particles,
        .animated-shapes,
        .sun-rays {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Toggle effects
  toggleEffects(enabled) {
    const particles = document.querySelector('.dynamic-particles');
    const shapes = document.querySelector('.animated-shapes');
    
    if (particles) particles.style.opacity = enabled ? '1' : '0';
    if (shapes) shapes.style.opacity = enabled ? '1' : '0';
  }

  // Cleanup
  cleanup() {
    const particles = document.querySelector('.dynamic-particles');
    const shapes = document.querySelector('.animated-shapes');
    const rays = document.querySelector('.sun-rays');
    
    if (particles) particles.remove();
    if (shapes) shapes.remove();
    if (rays) rays.remove();
    
    this.backgroundAnimations.forEach(animation => {
      if (animation.cancel) animation.cancel();
    });
    this.backgroundAnimations.clear();
  }
}

// Create singleton instance
const dynamicThemeService = new DynamicThemeService();

export default dynamicThemeService;