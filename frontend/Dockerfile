# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a script to inject environment variables at runtime
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "window._env_ = {" > /app/build/env-config.js' >> /app/start.sh && \
    echo 'echo "  REACT_APP_API_BASE_URL: \"$REACT_APP_API_BASE_URL\"," >> /app/build/env-config.js' >> /app/start.sh && \
    echo 'echo "};" >> /app/build/env-config.js' >> /app/start.sh && \
    echo 'serve -s build -l 3000' >> /app/start.sh && \
    chmod +x /app/start.sh

# Build the React app for production (without env vars)
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

# Create placeholder for env-config.js
RUN echo 'window._env_ = {};' > /app/build/env-config.js

# Expose port 3000
EXPOSE 3000

# Use the startup script
CMD ["/app/start.sh"]
