# Nephos Quick Deploy Script for Windows PowerShell
# This script deploys the Nephos backend to AWS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Nephos Backend Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SAM CLI is installed
Write-Host "Checking AWS SAM CLI installation..." -ForegroundColor Yellow
try {
    $samVersion = sam --version
    Write-Host "✓ SAM CLI found: $samVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS SAM CLI not found!" -ForegroundColor Red
    Write-Host "Please install SAM CLI first:" -ForegroundColor Red
    Write-Host "  https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html" -ForegroundColor Yellow
    exit 1
}

# Check if AWS CLI is configured
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials not configured!" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Navigate to backend directory
Set-Location $PSScriptRoot
Write-Host "✓ Working directory: $PSScriptRoot" -ForegroundColor Green
Write-Host ""

# Prompt for Vultr API Key
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if parameters.local.json exists
if (Test-Path "parameters.local.json") {
    Write-Host "Found existing parameters.local.json" -ForegroundColor Green
    $useExisting = Read-Host "Use existing configuration? (Y/n)"

    if ($useExisting -eq "" -or $useExisting -eq "Y" -or $useExisting -eq "y") {
        $parametersFile = "parameters.local.json"
        $params = Get-Content $parametersFile | ConvertFrom-Json

        Write-Host ""
        Write-Host "Using configuration:" -ForegroundColor Cyan
        Write-Host "  Snowflake Account: $($params.SnowflakeAccount)" -ForegroundColor White
        Write-Host "  Snowflake User: $($params.SnowflakeUser)" -ForegroundColor White
        Write-Host "  Snowflake Database: $($params.SnowflakeDatabase)" -ForegroundColor White
        Write-Host "  Environment: $($params.Environment)" -ForegroundColor White
        Write-Host ""

        $vultrKey = $params.VultrApiKey
        if ($vultrKey -eq "YOUR_VULTR_API_KEY_FROM_ENV") {
            Write-Host "⚠ Vultr API key not set in parameters.local.json!" -ForegroundColor Yellow
            $vultrKey = Read-Host "Enter your Vultr API Key"
        }
    } else {
        $vultrKey = Read-Host "Enter your Vultr API Key"
    }
} else {
    Write-Host "parameters.local.json not found. Manual configuration required." -ForegroundColor Yellow
    $vultrKey = Read-Host "Enter your Vultr API Key"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Building Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Validate template
Write-Host "Validating SAM template..." -ForegroundColor Yellow
sam validate --lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Template validation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Template validated successfully" -ForegroundColor Green
Write-Host ""

# Build
Write-Host "Building Lambda functions..." -ForegroundColor Yellow
sam build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed successfully" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying to AWS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$deployType = Read-Host "Deploy type: (1) Guided (first time), (2) Quick (if already deployed) [1/2]"

if ($deployType -eq "1" -or $deployType -eq "") {
    Write-Host "Starting guided deployment..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "TIPS:" -ForegroundColor Cyan
    Write-Host "  - Stack name: nephos-backend-dev" -ForegroundColor White
    Write-Host "  - Region: us-east-2 (or your preferred region)" -ForegroundColor White
    Write-Host "  - Allow IAM role creation: Y" -ForegroundColor White
    Write-Host "  - Save configuration: Y" -ForegroundColor White
    Write-Host ""

    sam deploy --guided
} else {
    Write-Host "Starting quick deployment..." -ForegroundColor Yellow
    sam deploy --parameter-overrides VultrApiKey="$vultrKey"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Backend successfully deployed to AWS" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy the API endpoint URLs from the outputs above" -ForegroundColor White
Write-Host ""
Write-Host "2. Create client/.env.local file with:" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_API_URL=https://YOUR-API-ID.execute-api.REGION.amazonaws.com" -ForegroundColor Yellow
Write-Host "   NEXT_PUBLIC_WEBSOCKET_URL=wss://YOUR-WS-ID.execute-api.REGION.amazonaws.com/production" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Start the frontend:" -ForegroundColor White
Write-Host "   cd ../client" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. View CloudWatch logs:" -ForegroundColor White
Write-Host "   aws logs tail /aws/lambda/nephos-sentinel-dev --follow" -ForegroundColor Yellow
Write-Host ""
Write-Host "Your Nephos dashboard is now connected to your Vultr server!" -ForegroundColor Green
Write-Host ""
