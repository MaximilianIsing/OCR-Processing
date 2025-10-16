FROM node:18

# Install poppler-utils (required for pdf-poppler on Linux)
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port (Render will set PORT env variable)
EXPOSE 3000

# Run the application
CMD ["node", "example.js"]

