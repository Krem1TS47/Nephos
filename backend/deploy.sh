#!/bin/bash

# Nephos Backend Deployment Script
# Deploys all Lambda functions and infrastructure using AWS SAM

set -e

echo "================================================"
echo "Nephos Backend Deployment"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo -e "${RED}Error: AWS SAM CLI is not installed${NC}"
    echo "Install it from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

# Parse arguments
ENVIRONMENT=${1:-dev}
PARAM_FILE=${2:-parameters.json}

echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Parameters File: ${PARAM_FILE}${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${GREEN}Step 1: Installing dependencies...${NC}"

install_deps() {
    local dir=$1
    if [ -f "$dir/package.json" ]; then
        echo "  Installing dependencies in $dir"
        cd "$dir"
        npm install --production
        cd - > /dev/null
    fi
}

install_deps "functions/sentinel"
install_deps "functions/ingest/vultr-metrics"
install_deps "functions/etl/dynamodb-to-snowflake"
install_deps "functions/api/insights"
install_deps "functions/api/analytics"
install_deps "functions/api/alerts"

echo ""

# Step 2: Validate SAM template
echo -e "${GREEN}Step 2: Validating SAM template...${NC}"
sam validate --lint

echo ""

# Step 3: Build SAM application
echo -e "${GREEN}Step 3: Building SAM application...${NC}"
sam build --use-container

echo ""

# Step 4: Deploy SAM application
echo -e "${GREEN}Step 4: Deploying to AWS...${NC}"

if [ -f "$PARAM_FILE" ]; then
    sam deploy \
        --stack-name "nephos-backend-${ENVIRONMENT}" \
        --parameter-overrides "$(cat $PARAM_FILE | jq -r '.[] | "\(.ParameterKey)=\(.ParameterValue)"' | tr '\n' ' ')" \
        --capabilities CAPABILITY_IAM \
        --region us-east-2 \
        --confirm-changeset \
        --resolve-s3
else
    echo -e "${YELLOW}Warning: Parameter file not found. Using guided deployment...${NC}"
    sam deploy \
        --stack-name "nephos-backend-${ENVIRONMENT}" \
        --guided
fi

echo ""

# Step 5: Get stack outputs
echo -e "${GREEN}Step 5: Retrieving stack outputs...${NC}"

INGESTION_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "nephos-backend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`VultrIngestionEndpoint`].OutputValue' \
    --output text \
    --region us-east-2)

INSIGHTS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "nephos-backend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`InsightsApiEndpoint`].OutputValue' \
    --output text \
    --region us-east-2)

ANALYTICS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "nephos-backend-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`AnalyticsApiEndpoint`].OutputValue' \
    --output text \
    --region us-east-2)

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}API Endpoints:${NC}"
echo "  Vultr Ingestion: ${INGESTION_ENDPOINT}"
echo "  AI Insights API: ${INSIGHTS_ENDPOINT}"
echo "  Analytics API:   ${ANALYTICS_ENDPOINT}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update your Vultr monitoring script with the ingestion endpoint:"
echo "   export INGESTION_ENDPOINT=\"${INGESTION_ENDPOINT}\""
echo ""
echo "2. Update your frontend .env with:"
echo "   NEXT_PUBLIC_API_URL=\"${ANALYTICS_ENDPOINT%/analytics}\""
echo ""
echo "3. Subscribe to SNS topic for alerts (optional):"
echo "   aws sns subscribe --topic-arn <TOPIC_ARN> --protocol email --notification-endpoint your@email.com"
echo ""
echo "4. Run Snowflake setup script:"
echo "   snowsql -a BCGIVNI-QN18742 -u BENCHING4755 -f ../snowflake/setup.sql"
echo ""
