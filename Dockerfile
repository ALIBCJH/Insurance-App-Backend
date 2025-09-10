# Use Node.js LTS as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (for caching npm install)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app code
COPY . .

# Expose the port your Express app runs on
EXPOSE 3000

# Define the start command
CMD ["npm", "start"]
