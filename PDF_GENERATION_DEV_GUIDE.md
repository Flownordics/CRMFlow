# PDF Generation in Development

## The Issue
PDF generation uses Netlify Functions which are **not available** when running `npm run dev` (plain Vite).

## Solution: Use Netlify Dev

To enable PDF generation for quotes, orders, and invoices in development:

```bash
npm run dev:netlify
```

This command:
- Starts the Vite dev server
- Serves Netlify functions at `/.netlify/functions/*`
- Enables full PDF generation functionality
- Runs on port 8888 by default

## What If I'm Already Running `npm run dev`?

1. **Stop** your current dev server (Ctrl+C)
2. **Run** `npm run dev:netlify` instead
3. **Access** the app at `http://localhost:8888` (not 8080)

## Why This Matters

The PDF generation flow:
1. Frontend calls `/.netlify/functions/pdf-react`
2. Netlify function fetches data from Supabase
3. Function generates PDF using `@react-pdf/renderer`
4. Returns base64-encoded PDF to frontend
5. Frontend displays/downloads the PDF

Without `netlify dev`, step 1 fails with a 404 error.

## Technical Details

### Vite Dev Server (`npm run dev`)
- ✅ Fast HMR and development
- ❌ No Netlify functions
- ❌ PDF generation fails with 404

### Netlify Dev Server (`npm run dev:netlify`)
- ✅ Fast HMR and development
- ✅ Netlify functions available
- ✅ PDF generation works perfectly
- Port: 8888 (configurable in netlify.toml)

## Vite Proxy Configuration

The Vite config now includes a proxy that attempts to forward function requests to `localhost:8888`. This means:

- If you run `npm run dev:netlify` in one terminal (port 8888)
- AND `npm run dev` in another (port 8080)
- The Vite server on 8080 will proxy function calls to 8888

**However**, it's simpler to just use `npm run dev:netlify` directly.

## Production

In production (Netlify), all of this works automatically:
- Functions are served by Netlify's infrastructure
- No special configuration needed
- All document types (quotes, orders, invoices) work perfectly

