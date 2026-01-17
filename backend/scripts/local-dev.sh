#!/bin/bash

# Nephos Backend Local Development Script
# Usage: ./scripts/local-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏠 Nephos Backend Local Development${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file. Please update it with your credentials.${NC}"
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
        exit 1
    fi
fi

# Load environment variables
echo -e "${GREEN}📝 Loading environment variables...${NC}"
export $(cat .env | grep -v '^#' | xargs)

# Check if serverless-offline is installed
if ! grep -q "serverless-offline" package.json; then
    echo -e "${YELLOW}📦 Installing serverless-offline...${NC}"
    npm install --save-dev serverless-offline
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
    npm install
fi

# Install function dependencies
echo -e "${GREEN}📦 Checking function dependencies...${NC}"

FUNCTIONS=(
    "functions/api/metrics"
    "functions/api/alerts"
    "functions/api/analytics"
    "functions/sentinel"
    "functions/etl/dynamodb-to-snowflake"
)

for FUNC in "${FUNCTIONS[@]}"; do
    if [ -f "$FUNC/package.json" ] && [ ! -d "$FUNC/node_modules" ]; then
        echo "  Installing dependencies for $FUNC..."
        (cd "$FUNC" && npm install)
    fi
done

# Check for DynamoDB Local (optional)
echo ""
echo -e "${YELLOW}💡 Tip: For full local development, consider running DynamoDB Local:${NC}"
echo "   docker run -p 8000:8000 amazon/dynamodb-local"
echo ""

# Start serverless offline
echo -e "${GREEN}🚀 Starting Serverless Offline...${NC}"
echo ""
echo -e "${YELLOW}API will be available at: http://localhost:3000${NC}"
echo ""

serverless offline start --stage local --httpPort 3000
