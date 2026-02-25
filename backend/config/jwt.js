/**
 * Centralised JWT secret resolution.
 *
 * Rules:
 *  - Development: uses JWT_SECRET env var if set; otherwise auto-generates a
 *    cryptographically random secret for the current process lifetime and
 *    prints a suggestion so the developer can pin it.
 *  - Production: JWT_SECRET env var is REQUIRED and must be ≥ 32 chars.
 *    The process throws at startup if it is missing or too short.
 *
 * All backend route files should import from here instead of duplicating this
 * logic (or, worse, embedding a known fallback string in source code).
 */

const crypto = require('crypto');

const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET;

  if (envSecret) {
    if (envSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security.');
    }
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  // Development only — generate an ephemeral secret for this process run.
  const devSecret = crypto.randomBytes(64).toString('hex');
  console.warn('⚠️  JWT: No JWT_SECRET env var set. Using an auto-generated secret for this session.');
  console.warn(`💡  Add to backend/.env:  JWT_SECRET=${devSecret}`);
  return devSecret;
})();

module.exports = { JWT_SECRET };
