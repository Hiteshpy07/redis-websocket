# ---- Stage 1: Build the React Application ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy package manifests & install dependencies
COPY package*.json ./
RUN npm i

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy built static files from Stage 1 into Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

