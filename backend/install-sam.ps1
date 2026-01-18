# AWS SAM CLI Installation Script for Windows
# Run as Administrator: Set-ExecutionPolicy Bypass -Scope Process -Force; .\install-sam.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "AWS SAM CLI Installation for Nephos" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: Not running as Administrator. Some installations may fail." -ForegroundColor Yellow
    Write-Host "To run as Admin: Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# 1. Check/Install Chocolatey
Write-Host "Step 1: Checking Chocolatey..." -ForegroundColor Green
if (Test-Command choco) {
    Write-Host "  ✓ Chocolatey is already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    if (Test-Command choco) {
        Write-Host "  ✓ Chocolatey installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Chocolatey installation failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# 2. Check/Install AWS CLI
Write-Host "Step 2: Checking AWS CLI..." -ForegroundColor Green
if (Test-Command aws) {
    $awsVersion = aws --version
    Write-Host "  ✓ AWS CLI is already installed: $awsVersion" -ForegroundColor Green
} else {
    Write-Host "  Installing AWS CLI..." -ForegroundColor Yellow
    choco install awscli -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    if (Test-Command aws) {
        Write-Host "  ✓ AWS CLI installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ AWS CLI installation failed. Please restart PowerShell and try again." -ForegroundColor Red
    }
}
Write-Host ""

# 3. Check/Install AWS SAM CLI
Write-Host "Step 3: Checking AWS SAM CLI..." -ForegroundColor Green
if (Test-Command sam) {
    $samVersion = sam --version
    Write-Host "  ✓ AWS SAM CLI is already installed: $samVersion" -ForegroundColor Green
} else {
    Write-Host "  Installing AWS SAM CLI..." -ForegroundColor Yellow
    choco install aws-sam-cli -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    if (Test-Command sam) {
        Write-Host "  ✓ AWS SAM CLI installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ AWS SAM CLI installation failed. Please restart PowerShell and try again." -ForegroundColor Red
    }
}
Write-Host ""

# 4. Check Python (required for SAM)
Write-Host "Step 4: Checking Python..." -ForegroundColor Green
if (Test-Command python) {
    $pythonVersion = python --version
    Write-Host "  ✓ Python is installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "  Installing Python..." -ForegroundColor Yellow
    choco install python -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    if (Test-Command python) {
        Write-Host "  ✓ Python installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Python installation failed" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Check Node.js
Write-Host "Step 5: Checking Node.js..." -ForegroundColor Green
if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js is installed: $nodeVersion" -ForegroundColor Green

    # Check if version is 18+
    $version = [int]($nodeVersion -replace 'v(\d+)\..*','$1')
    if ($version -lt 18) {
        Write-Host "  ⚠ Warning: Node.js 18+ recommended, you have $nodeVersion" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Installing Node.js LTS..." -ForegroundColor Yellow
    choco install nodejs-lts -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    if (Test-Command node) {
        Write-Host "  ✓ Node.js installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Node.js installation failed" -ForegroundColor Red
    }
}
Write-Host ""

# 6. Check Docker (optional but recommended)
Write-Host "Step 6: Checking Docker..." -ForegroundColor Green
if (Test-Command docker) {
    $dockerVersion = docker --version
    Write-Host "  ✓ Docker is installed: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Docker is not installed (optional)" -ForegroundColor Yellow
    Write-Host "  Docker is needed for 'sam build --use-container'" -ForegroundColor Yellow
    Write-Host "  Install manually from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
}
Write-Host ""

# 7. Install jq (for deploy script)
Write-Host "Step 7: Checking jq..." -ForegroundColor Green
if (Test-Command jq) {
    Write-Host "  ✓ jq is already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing jq..." -ForegroundColor Yellow
    choco install jq -y

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    if (Test-Command jq) {
        Write-Host "  ✓ jq installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ jq installation failed" -ForegroundColor Red
    }
}
Write-Host ""

# Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Installation Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$allInstalled = $true

if (Test-Command choco) {
    Write-Host "✓ Chocolatey" -ForegroundColor Green
} else {
    Write-Host "✗ Chocolatey" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command aws) {
    Write-Host "✓ AWS CLI" -ForegroundColor Green
} else {
    Write-Host "✗ AWS CLI" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command sam) {
    Write-Host "✓ AWS SAM CLI" -ForegroundColor Green
} else {
    Write-Host "✗ AWS SAM CLI" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command python) {
    Write-Host "✓ Python" -ForegroundColor Green
} else {
    Write-Host "✗ Python" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command node) {
    Write-Host "✓ Node.js" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js" -ForegroundColor Red
    $allInstalled = $false
}

if (Test-Command docker) {
    Write-Host "✓ Docker" -ForegroundColor Green
} else {
    Write-Host "⚠ Docker (optional)" -ForegroundColor Yellow
}

if (Test-Command jq) {
    Write-Host "✓ jq" -ForegroundColor Green
} else {
    Write-Host "✗ jq" -ForegroundColor Red
    $allInstalled = $false
}

Write-Host ""

if ($allInstalled) {
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "✓ All required tools installed!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart PowerShell to refresh environment variables" -ForegroundColor White
    Write-Host "2. Configure AWS credentials: aws configure" -ForegroundColor White
    Write-Host "3. Install Lambda dependencies: .\install-dependencies.ps1" -ForegroundColor White
    Write-Host "4. Deploy: sam build && sam deploy --guided" -ForegroundColor White
} else {
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "⚠ Some tools failed to install" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Close and reopen PowerShell as Administrator" -ForegroundColor White
    Write-Host "2. Run this script again" -ForegroundColor White
    Write-Host "3. If issues persist, install manually from:" -ForegroundColor White
    Write-Host "   - AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor White
    Write-Host "   - AWS SAM: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html" -ForegroundColor White
}

Write-Host ""
