#!/bin/bash

# Nephos Backend Destroy Script
# Usage: ./scripts/destroy.sh [stage] [region]
# Example: ./scripts/destroy.sh dev us-east-1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STAGE=${1:-dev}
REGION=${2:-us-east-1}

echo -e "${RED}⚠️  Nephos Backend Destruction${NC}"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo ""

# Confirmation prompt
echo -e "${YELLOW}This will remove ALL resources for stage '$STAGE' in region '$REGION'${NC}"
echo -e "${YELLOW}Including:${NC}"
echo "  - Lambda functions"
echo "  - API Gateway"
echo "  - DynamoDB tables (and all data)"
echo "  - CloudWatch log groups"
echo "  - IAM roles"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    echo -e "${GREEN}Cancelled. No resources were deleted.${NC}"
    exit 0
fi

echo ""
echo -e "${RED}🗑️  Removing resources...${NC}"

# Remove deployment
serverless remove --stage "$STAGE" --region "$REGION" --verbose

echo ""
echo -e "${GREEN}✅ Resources removed successfully!${NC}"
echo ""
echo -e "${YELLOW}Note: Some resources like CloudWatch logs may take a few minutes to fully delete.${NC}"
