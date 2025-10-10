# 🔧 Quick Fixes Reference Card

**For:** Immediate fixes (next 2 hours)  
**Priority:** 🔴 CRITICAL

---

## Fix 1: Axios Security (15 min)

```bash
npm update axios@latest
npm audit
git add package.json package-lock.json
git commit -m "fix: update axios to fix CVE vulnerability"
```

**Verify:** `npm audit` should show 0 vulnerabilities

---

## Fix 2: Test Config (15 min)

**File:** `vitest.config.ts` (line 19)

**Change this:**
```typescript
exclude: ["tests/e2e/**", "node_modules/**"],
```

**To this:**
```typescript
exclude: [
  "tests/e2e/**",
  "node_modules/**",
  ".netlify/**",
  "**/node_modules/**"
],
```

**Test:**
```bash
npm run test
```

**Verify:** Should see ~1600 tests (not 1800+), mostly passing

---

## Fix 3: Environment Template (30 min)

**Create:** `.env.example`

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
VITE_APP_NAME=CRMFlow
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false

# Development Only
VITE_USE_MOCKS=false
VITE_DISABLE_ACTIVITY_LOGGING=false

# Email Configuration (Optional)
VITE_EMAIL_PROVIDER=console
# Note: Google OAuth credentials are configured per workspace in Settings > Integrations
```

**Commit:**
```bash
git add .env.example
git commit -m "docs: add environment template file"
```

---

## Fix 4: Remove Secrets (30 min)

### File 1: `netlify.toml`

**Remove lines 48-56:**
```toml
# DELETE THIS:
[context.production.environment]
  VITE_SUPABASE_URL = "https://..."
  SUPABASE_ANON_KEY = "eyJ..."
  NETLIFY_URL = "https://..."

[context.development.environment]
  VITE_SUPABASE_URL = "https://..."
  SUPABASE_ANON_KEY = "eyJ..."
  NETLIFY_URL = "http://..."
```

**Replace with:**
```toml
# Environment variables are managed in Netlify UI
# Dashboard → Site Settings → Environment Variables
# See .env.example for required variables
```

### File 2: `PRODUCTION_DEPLOYMENT_REPORT.md`

**Replace lines 78-82:**
```markdown
### **Environment Variables:**
Environment variables are configured in Netlify Dashboard.
See `.env.example` for required variables.
```

**Commit:**
```bash
git add netlify.toml PRODUCTION_DEPLOYMENT_REPORT.md
git commit -m "security: remove exposed secrets from version control"
```

### Add to Netlify UI:

1. Go to: https://app.netlify.com/sites/crmflow-app/settings/env
2. Add variables:
   - `VITE_SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NETLIFY_URL`

---

## Fix 5: ESLint No-Console Rule (1 hour)

**File:** `eslint.config.js`

**Add to rules:**
```javascript
rules: {
  ...reactHooks.configs.recommended.rules,
  "react-refresh/only-export-components": [
    "warn",
    { allowConstantExport: true },
  ],
  // ... existing rules ...
  
  // ADD THIS:
  "no-console": ["error", { allow: [] }],
  "no-debugger": "error",
},
```

**Commit:**
```bash
git add eslint.config.js
git commit -m "chore: add no-console ESLint rule"
```

---

## Verification Commands

Run these to verify fixes:

```bash
# Security check
npm audit

# Type check
npm run typecheck

# Linting
npm run lint

# Tests
npm run test

# Build
npm run build
```

All should pass ✅

---

## Next Steps

After these quick fixes are complete, see:
- `IMPROVEMENT_ACTION_PLAN.md` for detailed week-by-week plan
- `COMPREHENSIVE_PROJECT_AUDIT.md` for full analysis

---

**Time Required:** ~2 hours  
**Impact:** Fixes critical security issues and test infrastructure

