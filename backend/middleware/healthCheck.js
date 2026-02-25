// Health check middleware
const healthCheck = (req, res, next) => {
  // Simple pass-through middleware
  // Can be enhanced for more sophisticated health checks
  next();
};

module.exports = healthCheck;
