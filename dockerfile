FROM apify/actor-node:20

# Copy all files to container
COPY . ./

# Install dependencies and Playwright browsers
RUN npm install --quiet --only=prod --no-optional \
 && npx playwright install --with-deps

# Default run command
CMD ["node", "src/index.js"]
