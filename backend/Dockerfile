# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# Create uploads directory
RUN mkdir -p uploads/avatars uploads/user-media

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5001/api/ping || exit 1

# Start server
CMD ["node", "server.js"]