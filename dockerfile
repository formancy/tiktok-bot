FROM mcr.microsoft.com/playwright:v1.43.0-focal

# Install Apify SDK
RUN npm install apify --no-optional --only=prod

# Copy files
COPY . ./

# Install remaining dependencies
RUN npm install --no-optional

# Default run command
CMD ["node", "src/index.js"]
