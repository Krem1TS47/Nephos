@echo off
echo =====================================
echo Nephos Backend Setup
echo =====================================
echo.

echo Step 1: Installing AWS SAM CLI and prerequisites...
echo.
powershell -ExecutionPolicy Bypass -File install-sam.ps1
echo.

echo =====================================
echo.
echo Step 2: Installing Lambda dependencies...
echo.
powershell -ExecutionPolicy Bypass -File install-dependencies.ps1
echo.

echo =====================================
echo Setup Complete!
echo =====================================
echo.
echo Next: Configure AWS credentials with 'aws configure'
echo Then: Deploy with 'sam build' and 'sam deploy --guided'
echo.
pause
