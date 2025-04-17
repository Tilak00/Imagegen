#!/bin/bash

# Deployment script for Ghibli AI Generator

# Exit on error
set -e

# Display help message
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "Deployment script for Ghibli AI Generator"
  echo ""
  echo "Usage: ./deploy.sh [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help     Show this help message"
  echo "  --vercel       Deploy to Vercel (default)"
  echo "  --docker       Deploy using Docker"
  echo ""
  exit 0
fi

# Default deployment method
DEPLOY_METHOD="vercel"

# Parse arguments
for arg in "$@"; do
  case $arg in
    --vercel)
      DEPLOY_METHOD="vercel"
      shift
      ;;
    --docker)
      DEPLOY_METHOD="docker"
      shift
      ;;
  esac
done

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "Error: .env.local file not found."
  echo "Please create a .env.local file with your environment variables."
  echo "You can use .env.local.example as a template."
  exit 1
fi

# Build the application
echo "Building the application..."
npm run build

# Deploy based on selected method
if [ "$DEPLOY_METHOD" == "vercel" ]; then
  echo "Deploying to Vercel..."
  
  # Check if Vercel CLI is installed
  if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
  fi
  
  # Deploy to Vercel
  vercel --prod
  
elif [ "$DEPLOY_METHOD" == "docker" ]; then
  echo "Deploying with Docker..."
  
  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    echo "Error: Docker not found. Please install Docker first."
    exit 1
  fi
  
  # Build and run Docker container
  docker-compose up -d --build
  
  echo "Application deployed successfully with Docker."
  echo "You can access it at http://localhost:3000"
fi

echo "Deployment completed successfully!"
