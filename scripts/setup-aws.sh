#!/bin/bash

# Nephos AWS Setup Script
# This script helps configure AWS credentials and verify setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Nephos AWS Setup${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo ""
    echo "Please install the AWS CLI:"
    echo "  macOS: brew install awscli"
    echo "  Linux: sudo apt-get install awscli"
    echo "  Windows: https://aws.amazon.com/cli/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI is installed${NC}"
aws --version
echo ""

# Check if AWS credentials are configured
if aws sts get-caller-identity &> /dev/null; then
    echo -e "${GREEN}✅ AWS credentials are configured${NC}"
    echo ""
    echo "Current AWS Identity:"
    aws sts get-caller-identity
    echo ""
else
    echo -e "${YELLOW}⚠️  AWS credentials are not configured${NC}"
    echo ""
    echo "To configure AWS credentials, run:"
    echo "  aws configure"
    echo ""
    echo "You will need:"
    echo "  - AWS Access Key ID"
    echo "  - AWS Secret Access Key"
    echo "  - Default region (e.g., us-east-1)"
    echo ""

    read -p "Would you like to configure AWS credentials now? (y/n): " CONFIGURE

    if [ "$CONFIGURE" = "y" ] || [ "$CONFIGURE" = "Y" ]; then
        aws configure
        echo ""
        echo -e "${GREEN}✅ AWS credentials configured${NC}"
    else
        echo -e "${YELLOW}Skipping AWS credential configuration${NC}"
        exit 1
    fi
fi

# Verify permissions
echo -e "${BLUE}🔍 Verifying AWS permissions...${NC}"
echo ""

REQUIRED_PERMISSIONS=(
    "lambda:CreateFunction"
    "lambda:UpdateFunctionCode"
    "dynamodb:CreateTable"
    "apigateway:POST"
    "iam:CreateRole"
    "cloudformation:CreateStack"
    "s3:CreateBucket"
)

echo "Testing required AWS permissions..."
echo "(Note: This is a basic check and may not be comprehensive)"
echo ""

# Test Lambda permissions
if aws lambda list-functions --max-items 1 &> /dev/null; then
    echo -e "${GREEN}✅ Lambda permissions OK${NC}"
else
    echo -e "${RED}❌ Lambda permissions missing or insufficient${NC}"
fi

# Test DynamoDB permissions
if aws dynamodb list-tables --max-items 1 &> /dev/null; then
    echo -e "${GREEN}✅ DynamoDB permissions OK${NC}"
else
    echo -e "${RED}❌ DynamoDB permissions missing or insufficient${NC}"
fi

# Test IAM permissions
if aws iam list-roles --max-items 1 &> /dev/null; then
    echo -e "${GREEN}✅ IAM permissions OK${NC}"
else
    echo -e "${RED}❌ IAM permissions missing or insufficient${NC}"
fi

# Test CloudFormation permissions
if aws cloudformation list-stacks --max-items 1 &> /dev/null; then
    echo -e "${GREEN}✅ CloudFormation permissions OK${NC}"
else
    echo -e "${RED}❌ CloudFormation permissions missing or insufficient${NC}"
fi

echo ""
echo -e "${BLUE}📋 Setup Summary${NC}"
echo ""
echo "Current AWS Region: $(aws configure get region)"
echo "AWS Account ID: $(aws sts get-caller-identity --query Account --output text)"
echo ""

echo -e "${GREEN}✅ AWS setup verification complete${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update backend/.env with your configuration"
echo "2. Configure Snowflake credentials"
echo "3. Run: cd backend && ./scripts/deploy.sh dev"
echo ""
