# Production Dockerfile for SkillSwap Backend
FROM node:18-alpine

# Install production dependencies
RUN apk add --no-cache curl openssl


# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S skillswap -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install && npm cache clean --force

# Copy Prisma schema before generation
COPY prisma ./prisma

# Generate Prisma client (needs all dependencies)
RUN npx prisma generate
RUN npx prisma migrate deploy --name init

# Copy source code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p uploads logs && chown -R skillswap:nodejs uploads logs

# Set user for security
USER skillswap

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Command to run production server
CMD ["npm", "start"]