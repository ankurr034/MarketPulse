FROM node:20-alpine

WORKDIR /app

# Copy package descriptors first to leverage build cache
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 5001

ENV PORT=5001
ENV MONGO_URI=mongodb://mongodb:27017/trading_dashboard

CMD ["node", "server.js"]
