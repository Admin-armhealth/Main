
# Base image with Node + Playwright dependencies
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript (optional if using ts-node/tsx in prod, but better to build)
# For simplicity in this specialized worker, we'll run with tsx directly
# RUN npm run build 

# Expose port
EXPOSE 8080

# Environment variables should be passed at runtime, but we set a default PORT
ENV PORT=8080

# Command to run the server
CMD ["npx", "tsx", "src/server.ts"]
