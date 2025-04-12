FROM mcr.microsoft.com/playwright:v1.43.0-focal

# Create app directory
WORKDIR /app

# Copy only package files first for caching
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of your code
COPY . ./

# Start the bot
CMD ["node", "src/index.js"]
