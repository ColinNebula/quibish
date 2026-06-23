/**
 * Liquid Glass UI Components
 * Ready-to-use React components with liquid glass effects
 */

import React, { useEffect } from 'react';
import liquidGlassEffects from '../utils/liquidGlassEffects';

/**
 * GlassCard - Beautiful frosted glass card
 */
export const GlassCard = ({ 
  children, 
  shimmer = false, 
  animated = false, 
  hover = true,
  className = '',
  ...props 
}) => {
  const classes = [
    'glass-base',
    shimmer && 'glass-shimmer',
    animated && 'animated',
    hover && 'glass-interactive',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

/**
 * LiquidGlassCard - Animated liquid glass card with better defaults
 */
export const LiquidGlassCard = ({ 
  children, 
  onHover = null, 
  onClick = null,
  className = '',
  ...props 
}) => {
  const handleMouseEnter = () => {
    liquidGlassEffects.haptic.light();
    onHover?.();
  };

  const handleClick = () => {
    liquidGlassEffects.haptic.medium();
    onClick?.();
  };

  return (
    <div 
      className={`liquid-glass-card ${className}`}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * GlassButton - Interactive glass button with morphing effect
 */
export const GlassButton = ({ 
  children, 
  onClick, 
  disabled = false,
  variant = 'primary', // 'primary', 'secondary', 'danger'
  className = '',
  ...props 
}) => {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
  };

  const handleClick = (e) => {
    liquidGlassEffects.haptic.impact();
    onClick?.(e);
  };

  return (
    <button 
      className={`button-liquid-morph ${variantStyles[variant]} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * FloatingActionButton - Spring-physics FAB
 */
export const FloatingActionButton = ({ 
  icon = '✨', 
  label = '', 
  onClick,
  position = 'bottom-right'
}) => {
  useEffect(() => {
    liquidGlassEffects.createFloatingActionButton({
      icon,
      label,
      onClick,
      position
    });
  }, [icon, label, onClick, position]);

  return null;
};

/**
 * DynamicNotification - Modern notification component
 */
export const DynamicNotification = ({
  message,
  icon = '📢',
  type = 'info', // 'info', 'success', 'warning', 'error'
  duration = 3000,
  action = null,
  onDismiss = null
}) => {
  useEffect(() => {
    window.showDynamicIslandNotification(message, {
      icon,
      type,
      duration,
      action,
      onDismiss
    });
  }, [message, icon, type, duration, action, onDismiss]);

  return null;
};

/**
 * GlassContainer - Container with glass effect
 */
export const GlassContainer = ({
  children,
  intensity = 'base', // 'subtle', 'base', 'heavy'
  className = '',
  ...props
}) => {
  const intensityClass = {
    subtle: 'glass-subtle',
    base: 'glass-base',
    heavy: 'glass-heavy'
  }[intensity];

  return (
    <div className={`${intensityClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * MessageBubble - Chat message with glass effect
 */
export const MessageBubble = ({
  sender,
  message,
  timestamp,
  isOwn = false,
  onReply = null,
  avatar
}) => {
  const handleClick = () => {
    if (onReply) {
      liquidGlassEffects.haptic.light();
      onReply();
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div 
        className={`liquid-glass-card glass-shimmer ${isOwn ? 'mr-2 max-w-xs' : 'ml-2 max-w-xs'}`}
        onClick={handleClick}
        style={{ cursor: onReply ? 'pointer' : 'default' }}
      >
        {!isOwn && <p className="text-xs font-semibold opacity-75 mb-1">{sender}</p>}
        <p className="text-sm">{message}</p>
        <p className="text-xs opacity-60 mt-1">{timestamp}</p>
      </div>
    </div>
  );
};

/**
 * ContactCard - Contact with glass effect
 */
export const ContactCard = ({
  name,
  email,
  phone,
  avatar,
  onSelect = null,
  selected = false
}) => {
  const handleClick = () => {
    liquidGlassEffects.haptic.success();
    onSelect?.();
    
    window.showDynamicIslandNotification(
      `${name} selected`,
      { icon: '✓', type: 'success', duration: 1500 }
    );
  };

  return (
    <div 
      className={`glass-interactive p-4 flex items-center gap-3 ${
        selected ? 'ring-2 ring-indigo-500' : ''
      }`}
      onClick={handleClick}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-xs opacity-60 truncate">{email || phone}</p>
      </div>
    </div>
  );
};

/**
 * VoiceCallStatus - Voice call with glass effect
 */
export const VoiceCallStatus = ({
  isConnecting = false,
  isConnected = false,
  duration = '00:00',
  remoteName = 'User'
}) => {
  useEffect(() => {
    if (isConnected) {
      liquidGlassEffects.haptic.success();
    } else if (isConnecting) {
      liquidGlassEffects.haptic.notification();
    }
  }, [isConnecting, isConnected]);

  return (
    <div className="glass-heavy p-6 text-center">
      <div className="mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 mx-auto" />
      </div>
      
      <h3 className="font-semibold text-lg mb-2">{remoteName}</h3>
      
      {isConnecting && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-sm">Connecting...</p>
        </div>
      )}
      
      {isConnected && (
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <p className="text-sm font-medium">{duration}</p>
        </div>
      )}
    </div>
  );
};

/**
 * HapticButton - Button that triggers haptic feedback with feedback visual
 */
export const HapticButton = ({
  children,
  hapticType = 'medium', // 'light', 'medium', 'heavy', 'success', 'warning', 'error'
  onClick,
  className = '',
  ...props
}) => {
  const handleClick = (e) => {
    liquidGlassEffects.haptic[hapticType]?.();
    onClick?.(e);
  };

  return (
    <button 
      className={`button-liquid-morph ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * NotificationList - Display multiple notifications at once
 */
export const NotificationList = ({ notifications = [] }) => {
  useEffect(() => {
    notifications.forEach((notif, index) => {
      setTimeout(() => {
        window.showDynamicIslandNotification(notif.message, {
          icon: notif.icon || '📢',
          type: notif.type || 'info',
          duration: notif.duration || 3000,
          action: notif.action
        });
      }, index * 300);
    });
  }, [notifications]);

  return null;
};

/**
 * ParallaxContainer - 3D parallax container
 */
export const ParallaxContainer = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`parallax-container ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * ParallaxLayer - Layer with depth effect
 */
export const ParallaxLayer = ({
  children,
  depth = 0, // -1, 1, 2, 3
  className = '',
  ...props
}) => {
  const depthClass = depth === -1 ? 'depth-minus' : `depth-${depth}`;
  return (
    <div className={`parallax-layer ${depthClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * Tilt3DElement - Element that tilts on hover
 */
export const Tilt3DElement = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`tilt-3d ${className}`} {...props}>
      {children}
    </div>
  );
};

/**
 * LiquidSurface - Animated liquid wave surface
 */
export const LiquidSurface = ({
  className = '',
  ...props
}) => {
  return (
    <div className={`liquid-surface ${className}`} {...props} />
  );
};

/**
 * BlendModeElement - Element with blend mode effect
 */
export const BlendModeElement = ({
  children,
  mode = 'overlay', // 'screen', 'multiply', 'overlay', 'soft-light', 'color-dodge'
  className = '',
  ...props
}) => {
  const modeClass = `blend-${mode}`;
  return (
    <div className={`${modeClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default {
  GlassCard,
  LiquidGlassCard,
  GlassButton,
  FloatingActionButton,
  DynamicNotification,
  GlassContainer,
  MessageBubble,
  ContactCard,
  VoiceCallStatus,
  HapticButton,
  NotificationList,
  ParallaxContainer,
  ParallaxLayer,
  Tilt3DElement,
  LiquidSurface,
  BlendModeElement
};
