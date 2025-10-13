# Fix Vite Dependencies - Complete Solution
# Run this script whenever you get "Cannot find module 'vite'" errors

Write-Host "🔧 CRMFlow - Vite Dependencies Fix Script" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Step 1: Remove conflicting lock files
Write-Host "Step 1: Cleaning up package manager conflicts..." -ForegroundColor Yellow
if (Test-Path "bun.lockb") {
    Remove-Item "bun.lockb" -Force
    Write-Host "✅ Removed bun.lockb" -ForegroundColor Green
}
if (Test-Path "yarn.lock") {
    Remove-Item "yarn.lock" -Force
    Write-Host "✅ Removed yarn.lock" -ForegroundColor Green
}
if (Test-Path "pnpm-lock.yaml") {
    Remove-Item "pnpm-lock.yaml" -Force
    Write-Host "✅ Removed pnpm-lock.yaml" -ForegroundColor Green
}

# Step 2: Clear caches
Write-Host "`nStep 2: Clearing caches..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "✅ Cleared Vite cache" -ForegroundColor Green
}

# Step 3: Reinstall dependencies
Write-Host "`nStep 3: Reinstalling dependencies..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache clean --force 2>&1 | Out-Null
npm install --include=dev

# Step 4: Validate installation
Write-Host "`nStep 4: Validating installation..." -ForegroundColor Yellow
$validationResult = npm run validate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All Vite dependencies installed correctly" -ForegroundColor Green
} else {
    Write-Host "❌ Validation failed!" -ForegroundColor Red
    Write-Host $validationResult
    exit 1
}

# Step 5: Instructions for TypeScript
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "🎯 IMPORTANT: Restart TypeScript Server" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan
Write-Host "If you still see 'Cannot find module' errors in Cursor:" -ForegroundColor Yellow
Write-Host "  1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)" -ForegroundColor White
Write-Host "  2. Type: 'TypeScript: Restart TS Server'" -ForegroundColor White
Write-Host "  3. Select and press Enter" -ForegroundColor White
Write-Host "  4. Wait 5-10 seconds for errors to clear`n" -ForegroundColor White
Write-Host "Alternative: Reload the entire window (Ctrl+Shift+P → 'Reload Window')`n" -ForegroundColor White

Write-Host "✅ Fix complete!" -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan

