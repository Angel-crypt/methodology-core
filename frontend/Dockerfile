# ============================================================
# Stage 1: Build
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer — only re-runs if package files change)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy source
COPY . .

# Build-time public env vars (baked into the JS bundle at build time)
# These must be set via --build-arg or docker-compose build.args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# ============================================================
# Stage 2: Serve with nginx
# ============================================================
FROM nginx:alpine AS runner

# Copy nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
