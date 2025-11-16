FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application files (only Node.js related)
COPY server.js .
COPY config.js .
COPY ingestion.js .
COPY ragChain.js .
COPY utils.js .
COPY vectoreStore.js .
COPY middleware ./middleware

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]