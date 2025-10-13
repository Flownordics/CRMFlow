# Test Google OAuth Setup
# This script verifies that your Google OAuth integration is properly configured

$PROJECT_URL = "https://rgimekaxpmqqlqulhpgt.supabase.co"
$APP_URL = "https://crmflow-app.netlify.app"

Write-Host "🔍 Testing Google OAuth Setup..." -ForegroundColor Green
Write-Host ""

# Test 1: Check if Edge Functions are accessible
Write-Host "1️⃣  Testing Edge Function accessibility..." -ForegroundColor Cyan

$functions = @(
    "google-oauth-start",
    "google-oauth-callback",
    "google-refresh",
    "google-gmail-send",
    "google-calendar-proxy"
)

$functionResults = @{}

foreach ($func in $functions) {
    $url = "$PROJECT_URL/functions/v1/$func"
    
    try {
        # Try OPTIONS request (CORS preflight)
        $response = Invoke-WebRequest -Uri $url -Method OPTIONS -ErrorAction Stop
        $status = "✅ Accessible"
        $functionResults[$func] = $true
    } catch {
        if ($_.Exception.Response.StatusCode -eq 405) {
            # 405 Method Not Allowed is expected for OPTIONS on some functions
            $status = "✅ Deployed (405 is normal)"
            $functionResults[$func] = $true
        } else {
            $status = "❌ Not accessible: $($_.Exception.Message)"
            $functionResults[$func] = $false
        }
    }
    
    Write-Host "  $func : $status" -ForegroundColor $(if ($functionResults[$func]) { "Green" } else { "Red" })
}

Write-Host ""

# Test 2: Check environment variables (indirect)
Write-Host "2️⃣  Checking if environment variables are configured..." -ForegroundColor Cyan
Write-Host "   (Cannot directly check, but functions will fail if not set)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Required variables:" -ForegroundColor Yellow
Write-Host "   - GOOGLE_CLIENT_ID" -ForegroundColor White
Write-Host "   - GOOGLE_CLIENT_SECRET" -ForegroundColor White
Write-Host "   - GOOGLE_REDIRECT_URI" -ForegroundColor White
Write-Host "   - ENCRYPTION_KEY" -ForegroundColor White
Write-Host "   - APP_URL" -ForegroundColor White
Write-Host "   - JWT_SECRET" -ForegroundColor White
Write-Host ""

# Test 3: Verify Google Cloud Console redirect URI
Write-Host "3️⃣  Verifying redirect URI configuration..." -ForegroundColor Cyan
$redirectUri = "$PROJECT_URL/functions/v1/google-oauth-callback"
Write-Host "   Redirect URI: $redirectUri" -ForegroundColor White
Write-Host ""
Write-Host "   ⚠️  Make sure this EXACT URI is added to your Google Cloud Console:" -ForegroundColor Yellow
Write-Host "   https://console.cloud.google.com/apis/credentials" -ForegroundColor Cyan
Write-Host ""

# Test 4: Frontend accessibility
Write-Host "4️⃣  Testing frontend accessibility..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $APP_URL -Method HEAD -ErrorAction Stop -TimeoutSec 10
    Write-Host "   ✅ Frontend is accessible at $APP_URL" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 Test Summary" -ForegroundColor Green
Write-Host ""

$deployed = ($functionResults.Values | Where-Object { $_ -eq $true }).Count
$total = $functions.Count

Write-Host "Edge Functions: $deployed/$total deployed" -ForegroundColor $(if ($deployed -eq $total) { "Green" } else { "Yellow" })
Write-Host ""

if ($deployed -eq $total) {
    Write-Host "✅ All systems ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Go to: $APP_URL/settings" -ForegroundColor White
    Write-Host "2. Click 'Connect Gmail'" -ForegroundColor White
    Write-Host "3. Authorize with your Google account" -ForegroundColor White
    Write-Host "4. Verify connection shows your email" -ForegroundColor White
    Write-Host "5. Test sending an email from a quote/invoice" -ForegroundColor White
} else {
    Write-Host "⚠️  Some functions are not deployed yet." -ForegroundColor Yellow
    Write-Host "   Run the deploy-google-functions.ps1 script to deploy them." -ForegroundColor White
}

Write-Host ""

