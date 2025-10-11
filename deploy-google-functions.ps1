# Deploy Google OAuth Edge Functions
# Usage: 
# 1. Get your Supabase access token from: https://supabase.com/dashboard/account/tokens
# 2. Run: $env:SUPABASE_ACCESS_TOKEN="your-token-here"; .\deploy-google-functions.ps1

Write-Host "🚀 Deploying Google OAuth Edge Functions..." -ForegroundColor Green
Write-Host ""

# Check if access token is set
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "❌ Error: SUPABASE_ACCESS_TOKEN not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "To deploy, run:" -ForegroundColor Yellow
    Write-Host '  $env:SUPABASE_ACCESS_TOKEN="your-token-here"' -ForegroundColor Cyan
    Write-Host "  .\deploy-google-functions.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Get your token from: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    exit 1
}

# List of functions to deploy
$functions = @(
    "google-oauth-start",
    "google-oauth-callback", 
    "google-refresh",
    "google-gmail-send",
    "google-calendar-proxy"
)

$success = 0
$failed = 0

foreach ($func in $functions) {
    Write-Host "📦 Deploying $func..." -ForegroundColor Cyan
    
    npx supabase functions deploy $func --no-verify-jwt 2>&1 | Tee-Object -Variable output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $func deployed successfully" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  ❌ $func deployment failed" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        $failed++
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 Deployment Summary" -ForegroundColor Green
Write-Host "  ✅ Success: $success" -ForegroundColor Green
Write-Host "  ❌ Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify environment variables are set in Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Test OAuth flow at: https://crmflow-app.netlify.app/settings" -ForegroundColor White
    Write-Host "3. Click 'Connect Gmail' or 'Connect Calendar'" -ForegroundColor White
} else {
    Write-Host "⚠️  Some functions failed to deploy. Check the errors above." -ForegroundColor Yellow
    exit 1
}

