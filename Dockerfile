FROM node:18

# Install poppler-utils and tesseract-ocr (native tesseract is 3-5x faster than tesseract.js)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

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

# Run the API server
CMD ["node", "server.js"]

