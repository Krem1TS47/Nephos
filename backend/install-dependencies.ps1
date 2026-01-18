# Lambda Dependencies Installation Script
# Installs npm packages for all Lambda functions

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Installing Lambda Dependencies" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$successCount = 0
$failCount = 0

# Function to install dependencies
function Install-Dependencies {
    param(
        [string]$Path,
        [string]$Name
    )

    Write-Host "Installing dependencies for $Name..." -ForegroundColor Green

    if (-not (Test-Path "$Path\package.json")) {
        Write-Host "  ⚠ No package.json found in $Path" -ForegroundColor Yellow
        return $false
    }

    Push-Location $Path

    try {
        # Clean install
        if (Test-Path "node_modules") {
            Write-Host "  Cleaning existing node_modules..." -ForegroundColor Yellow
            Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        }

        if (Test-Path "package-lock.json") {
            Remove-Item package-lock.json -ErrorAction SilentlyContinue
        }

        Write-Host "  Running npm install..." -ForegroundColor Yellow
        npm install --production 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Dependencies installed successfully" -ForegroundColor Green
            $script:successCount++
            Pop-Location
            return $true
        } else {
            Write-Host "  ✗ npm install failed" -ForegroundColor Red
            $script:failCount++
            Pop-Location
            return $false
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        $script:failCount++
        Pop-Location
        return $false
    }
}

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Install dependencies for each function
$functions = @(
    @{Path="functions\sentinel"; Name="Sentinel Function"},
    @{Path="functions\ingest\vultr-metrics"; Name="Vultr Ingestion Function"},
    @{Path="functions\etl\dynamodb-to-snowflake"; Name="ETL Function"},
    @{Path="functions\api\insights"; Name="Insights API"},
    @{Path="functions\api\analytics"; Name="Analytics API"},
    @{Path="functions\api\alerts"; Name="Alerts API"}
)

foreach ($func in $functions) {
    Install-Dependencies -Path $func.Path -Name $func.Name
    Write-Host ""
}

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Installation Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "✓ All dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update parameters.json with your credentials" -ForegroundColor White
    Write-Host "2. Validate: sam validate --lint" -ForegroundColor White
    Write-Host "3. Build: sam build" -ForegroundColor White
    Write-Host "4. Deploy: sam deploy --guided" -ForegroundColor White
} else {
    Write-Host "⚠ Some installations failed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Ensure you have Node.js 18+ installed: node --version" -ForegroundColor White
    Write-Host "2. Try installing manually in each function directory" -ForegroundColor White
    Write-Host "3. Check internet connection" -ForegroundColor White
    Write-Host "4. Clear npm cache: npm cache clean --force" -ForegroundColor White
}

Write-Host ""
