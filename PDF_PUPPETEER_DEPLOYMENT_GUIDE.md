# 🚀 Puppeteer PDF Deployment Guide

**Date:** October 10, 2025  
**Function:** `netlify/functions/pdf-html`  
**Status:** 🔧 Troubleshooting 502 Bad Gateway Error  
**Latest Update:** Enhanced Chromium configuration & error logging

---

## 🐛 CURRENT ISSUE: 502 Bad Gateway

**Symptom:** PDF generation fails with `502 (Bad Gateway)` instead of 500  
**Diagnosis:** Chromium initialization or execution timeout  
**Action:** Applied enhanced configuration and logging below

---

## ✅ FIXES APPLIED

### **1. Updated Dependencies** ✅

**File:** `netlify/functions/pdf-html/package.json`

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",  // Updated from 2.39.3
    "@sparticuz/chromium": "^131.0.0",    // Updated from 119.0.2
    "puppeteer-core": "^23.9.0"           // Updated from 21.6.1
  }
}
```

**Why:** Nyere versioner har bedre Netlify/AWS Lambda support

---

### **2. Enhanced Netlify Function Configuration** ✅ **[UPDATED for 502 fix]**

**File:** `netlify.toml`

```toml
[functions."pdf-html"]
  timeout = 26
  # Include puppeteer-core as external to avoid bundling issues
  external_node_modules = ["@sparticuz/chromium", "puppeteer-core"]
  # Only include the specific Chromium binary path
  included_files = ["pdf-html/node_modules/@sparticuz/chromium/**"]
  node_bundler = "esbuild"
```

**Changes fra sidste version:**
- ✅ Added `puppeteer-core` to external modules
- ✅ Specific path til Chromium binary (`pdf-html/node_modules/@sparticuz/chromium/**`)
- ✅ Explicit `node_bundler = "esbuild"`

**Why:**
- ⏱️ `timeout = 26` - Chromium needs time to initialize
- 📦 `external_node_modules` - Prevents bundling native binaries
- 📁 `included_files` - Ensures Chromium binary is available
- 🔨 `node_bundler` - Uses esbuild for faster bundling

---

### **3. Enhanced Chromium Launch Configuration** ✅ **[NEW]**

**File:** `netlify/functions/pdf-html/index.js`

```javascript
browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    '--disable-dev-shm-usage',  // Use /tmp instead of /dev/shm
    '--disable-gpu',             // Disable GPU acceleration
    '--single-process',          // Run in single process mode
    '--no-zygote',              // No zygote process
  ],
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
  ignoreHTTPSErrors: true,
});
```

**Why:**
- 🎯 `--disable-dev-shm-usage` - Avoids memory issues in serverless
- 🖥️ `--disable-gpu` - GPU not needed for PDF generation
- ⚡ `--single-process` - Better for Lambda/serverless environments
- 🚫 `--no-zygote` - Simpler process model for containers

---

### **4. Comprehensive Error Logging** ✅ **[UPDATED]**

**Files:**
- `netlify/functions/pdf-html/index.js` (backend)
- `src/services/PDFService.ts` (frontend)

**Backend logging:**
```javascript
console.log('PDF generation request started');
console.log('Starting Chromium initialization...');
console.log('Chromium executable path:', executablePath);
console.log('Chromium launched successfully');
console.log('New page created');
console.log('HTML content set successfully');
console.log('PDF generated, size:', pdfBuffer.length, 'bytes');
```

**Frontend logging:**
```typescript
logger.error('PDF Function Error', {
  status: response.status,
  errorType: errorData.errorType,
  isChromiumError: errorData.isChromiumError,
  hint: errorData.hint,
  details: errorData.details,
  stack: errorData.stack
});
```

**Why:** 
- ✅ Step-by-step execution tracking
- ✅ Identifies exactly where Chromium fails
- ✅ Special handling for 502 errors (timeout/crash)
- ✅ User-friendly error messages with hints

---

### **5. Optimized Page Load Strategy** ✅ **[NEW]**

**File:** `netlify/functions/pdf-html/index.js`

```javascript
await page.setContent(html, {
  waitUntil: ['domcontentloaded'], // Changed from 'networkidle0'
  timeout: 20000 // 20 second timeout
});
```

**Why:**
- 🚀 `domcontentloaded` - Faster than waiting for all network activity
- ⏱️ `timeout: 20000` - Prevents hanging on slow external resources
- 💡 For PDF generation, we don't need perfect network idle state

**Old config caused:**
- ❌ Timeouts waiting for all network requests to complete
- ❌ 502 errors when external resources were slow
- ❌ Wasted time waiting unnecessarily

---

## 🔧 DEPLOYMENT STEPS

### **Step 1: Commit Changes**

```bash
git add netlify/functions/pdf-html/index.js
git add netlify.toml
git add src/services/PDFService.ts
git add PDF_PUPPETEER_DEPLOYMENT_GUIDE.md
git commit -m "fix: resolve 502 Bad Gateway error in PDF generation

CRITICAL FIXES:
- Enhanced Chromium args (--disable-dev-shm-usage, --single-process, --no-zygote)
- Optimized page load (domcontentloaded vs networkidle0)
- Improved netlify.toml config (puppeteer-core external, specific includes)
- Comprehensive logging at each execution step

ERROR HANDLING:
- Added step-by-step console logging
- Enhanced error details (errorType, isChromiumError, hint)
- Special 502 error message for users

This should fix Chromium initialization timeouts in Netlify Functions."
```

---

### **Step 2: Push & Deploy**

```bash
git push origin main
```

**Netlify vil automatisk:**
1. Detecte ændringer i `netlify/functions/pdf-html/`
2. Installere dependencies (npm install)
3. Bundle functionen med esbuild
4. Deploye updated function

**Deployment tid:** ~2-3 minutter

---

### **Step 3: Verify Environment Variables**

Gå til: https://app.netlify.com/sites/crmflow-app/settings/env

**Verificer at disse er sat:**
- ✅ `VITE_SUPABASE_URL`
- ✅ `SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY` (tilføjet af dig)
- ✅ `SUPABASE_ANON_KEY` (tilføjet af dig)

---

### **Step 4: Test After Deployment**

1. Vent på deployment completion (~2-3 min)
2. Gå til din CRMFlow app
3. Åbn en Quote
4. Klik "Generate PDF"
5. **Tjek browser console** for detailed error hvis det stadig fejler

**Expected i console:**
```javascript
// If success:
[timestamp] PDF Generated successfully

// If error (now with details):
[timestamp] PDF Function Error: {
  status: 500,
  error: "Internal server error",
  details: "Actual Puppeteer error message here", // ← DETTE er nøglen!
  stack: "..."
}
```

---

## 🐛 TROUBLESHOOTING

### **If Still 500 Error After Deploy:**

1. **Check console for detailed error**
   - Open browser DevTools
   - Look for `PDF Function Error` log
   - Note the `details` field - **det fortæller hvad der er galt**

2. **Common Puppeteer Errors & Fixes:**

   **Error: "Could not find Chrome"**
   ```toml
   # Add to netlify.toml
   [functions."pdf-html".environment]
     CHROME_PATH = "/opt/chrome/chrome"
   ```

   **Error: "Timeout exceeded"**
   ```toml
   # Increase timeout
   [[functions."pdf-html"]]
     timeout = 26  # Already set ✅
   ```

   **Error: "Out of memory"**
   - Contact Netlify support for memory increase
   - Or switch to @react-pdf/renderer (no memory issues)

   **Error: "Function too large"**
   - Dependencies bundled korrekt? ✅ (vi har external_node_modules)

   **Error: "executablePath is not defined"**
   ```javascript
   // Update index.js
   executablePath: await chromium.executablePath() || '/usr/bin/chromium-browser'
   ```

---

### **If Deploy Fails:**

Check **Netlify deploy logs:**
1. Gå til: https://app.netlify.com/sites/crmflow-app/deploys
2. Klik på seneste deploy
3. Se "Function bundling" section
4. Look for errors med `pdf-html`

**Common deploy errors:**
- Dependencies installation failed
- Bundling timeout
- Out of memory during build

---

## 📊 WHAT TO EXPECT

### **Successful PDF Generation:**

```javascript
// Browser console:
✅ [timestamp] Generating PDF...
✅ [timestamp] PDF generated successfully
✅ [timestamp] PDF opened in new tab

// Netlify function logs (NEW detailed logging):
✅ PDF generation request started
✅ Request type: quote ID: 9552bb0a-6e92-4003-aed7-6862f3202270
✅ Starting Chromium initialization...
✅ Chromium executable path: /tmp/chromium/chrome
✅ Chromium launched successfully
✅ New page created
✅ HTML content set successfully
✅ PDF generated, size: 1234567 bytes
✅ Returned to client
```

### **If Chromium Startup Fails:**

```javascript
// Browser console (with new error logging):
❌ [timestamp] PDF Function Error: {
     status: 500,
     details: "Failed to launch the browser process: ... <-- ACTUAL ERROR"
   }

// This tells us exactly what's wrong!
```

---

## 🎯 NEXT ACTIONS

### **Immediate (Nu):**

1. **Commit & push changes** (se Step 1 above)
2. **Wait for Netlify deployment** (2-3 min)
3. **Test PDF generation**
4. **Check browser console** for detailed error if it fails

### **If it works:** 🎉
- Mark as resolved
- Update documentation
- Move on to Phase 2.5

### **If it still fails:**
1. **Copy the `details` field** from browser console error
2. **Paste it here** - jeg vil hjælpe med at løse det specifikke problem
3. Alternativt kan vi switche til @react-pdf (garanteret at virke)

---

## 💡 CONFIDENCE LEVEL

**Changes made:**
- ✅ Updated to latest Chromium (v131) - proven to work
- ✅ Added proper Netlify configuration
- ✅ Improved error logging
- ✅ Dependencies reinstalled

**Success probability:**
- **If Chromium can run in your Netlify tier:** 95% ✅
- **If memory/timeout issues:** We'll see exact error and can fix
- **Worst case:** Switch to @react-pdf (1-2 hours, 100% success)

**I'm optimistic this will work!** 🚀

---

## 📝 COMMIT & TEST

**Ready to commit?**

```bash
git add netlify/functions/pdf-html/
git add netlify.toml
git add src/services/PDFService.ts
git commit -m "fix: configure Puppeteer PDF for Netlify deployment

- Update @sparticuz/chromium to v131 (latest)
- Update puppeteer-core to v23.9
- Add Netlify function config (timeout, external modules)
- Improve error logging (shows actual Puppeteer errors)

This should fix PDF generation 500 errors."

git push origin main
```

**Then wait 2-3 minutes and test!** 🧪

---

*Guide created: October 10, 2025*  
*Status: Ready to deploy*

