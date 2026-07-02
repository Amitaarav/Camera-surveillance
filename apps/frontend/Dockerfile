FROM oven/bun:1.2.22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy application files and build
COPY . .
RUN bun run build

# Nginx stage to serve frontend and reverse proxy API/WebSocket
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
