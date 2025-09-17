/**
 * HTTPS Enforcement Middleware
 * Forces HTTPS connections in production and adds security headers
 */

const httpsEnforcementMiddleware = (req, res, next) => {
  // Only enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    // Check if request is not secure
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      // Redirect to HTTPS
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
  }

  // Add security headers for all environments
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

const securityHeadersMiddleware = (req, res, next) => {
  // Essential security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO: Remove unsafe-* in production
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' ws: wss:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  next();
};

module.exports = {
  httpsEnforcementMiddleware,
  securityHeadersMiddleware
};