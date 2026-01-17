#!/bin/bash

# Nephos Backend Deployment Script
# Usage: ./scripts/deploy.sh [stage] [region]
# Example: ./scripts/deploy.sh dev us-east-1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STAGE=${1:-dev}
REGION=${2:-us-east-1}

echo -e "${GREEN}🚀 Nephos Backend Deployment${NC}"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your actual credentials before deploying!${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found!${NC}"
        exit 1
    fi
fi

# Load environment variables
echo -e "${GREEN}📝 Loading environment variables...${NC}"
export $(cat .env | grep -v '^#' | xargs)

# Check for required environment variables
REQUIRED_VARS=("SNOWFLAKE_ACCOUNT" "SNOWFLAKE_USERNAME" "SNOWFLAKE_PASSWORD" "SNOWFLAKE_DATABASE" "SNOWFLAKE_WAREHOUSE" "SNOWFLAKE_SCHEMA")
MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ] || [ "${!VAR}" = "your-"* ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing or incomplete environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    echo -e "${YELLOW}Please update your .env file with actual values.${NC}"
    exit 1
fi

# Check if serverless is installed
if ! command -v serverless &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Serverless Framework...${NC}"
    npm install -g serverless@4
fi

# Install backend dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
npm ci

# Install function dependencies
echo -e "${GREEN}📦 Installing function dependencies...${NC}"

FUNCTIONS=(
    "functions/api/metrics"
    "functions/api/alerts"
    "functions/api/analytics"
    "functions/sentinel"
    "functions/etl/dynamodb-to-snowflake"
)

for FUNC in "${FUNCTIONS[@]}"; do
    if [ -f "$FUNC/package.json" ]; then
        echo "  Installing dependencies for $FUNC..."
        (cd "$FUNC" && npm ci)
    fi
done

# Validate serverless configuration
echo -e "${GREEN}✅ Validating serverless configuration...${NC}"
serverless print --stage "$STAGE" --region "$REGION" > /dev/null

# Deploy
echo -e "${GREEN}🚀 Deploying to AWS...${NC}"
serverless deploy --stage "$STAGE" --region "$REGION" --verbose

# Get deployment info
echo ""
echo -e "${GREEN}📊 Deployment Information:${NC}"
serverless info --stage "$STAGE" --region "$REGION"

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test your API endpoints"
echo "2. Check CloudWatch logs for any errors"
echo "3. Monitor DynamoDB tables"
echo "4. Verify Snowflake integration"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "  View logs: serverless logs -f metricsApi --stage $STAGE --region $REGION --tail"
echo "  Remove deployment: serverless remove --stage $STAGE --region $REGION"
echo "  Invoke function: serverless invoke -f sentinel --stage $STAGE --region $REGION"
