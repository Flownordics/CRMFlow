# Netlify Environment Variables Setup

This guide shows how to set up the required environment variables in Netlify for the Google Integrations v2 system.

## ⚠️ Security Note

**NEVER commit sensitive keys to version control!** The `netlify.toml` file has been cleaned up to remove hardcoded secrets.

## Required Environment Variables

Set these in your Netlify dashboard under **Site settings > Environment variables**:

### 1. VITE_SUPABASE_URL
```
VITE_SUPABASE_URL=https://vziwouylxsfbummcvckx.supabase.co
```

### 2. VITE_SUPABASE_ANON_KEY
```
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
*Get this from Supabase Dashboard > Settings > API > anon/public key*

### 3. APP_URL (Optional - for OAuth redirects)
```
APP_URL=https://crmflow-app.netlify.app/
```
*This should match your Netlify site URL*

### 4. JWT_SECRET (Optional - if needed by frontend)
```
JWT_SECRET=d7MQR7lFqlXDxd22DDpMbXGO1cQItJTYmLWgk/gLlAdw1ZhmO1jh+lOTIZbPw4BbAiapjqfAddA2KA2sAvrjIg==
```
*Same value used in Supabase Edge Functions*

## How to Set Environment Variables in Netlify

### Method 1: Netlify Dashboard (Recommended)
1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** > **Environment variables**
4. Click **Add variable**
5. Add each variable with its value
6. Click **Save**

### Method 2: Netlify CLI
```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://vziwouylxsfbummcvckx.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your_anon_key_here"
netlify env:set APP_URL "https://crmflow-app.netlify.app/"
netlify env:set JWT_SECRET "d7MQR7lFqlXDxd22DDpMbXGO1cQItJTYmLWgk/gLlAdw1ZhmO1jh+lOTIZbPw4BbAiapjqfAddA2KA2sAvrjIg=="
```

## Architecture Overview

### Frontend (Netlify)
- **VITE_SUPABASE_URL**: Connects frontend to Supabase
- **VITE_SUPABASE_ANON_KEY**: Allows frontend to make authenticated requests
- **APP_URL**: Used for OAuth redirects (optional)
- **JWT_SECRET**: Used for OAuth state signing (optional)

### Backend (Supabase Edge Functions)
- **SUPABASE_URL**: Automatically provided by Supabase
- **SUPABASE_SERVICE_ROLE_KEY**: Automatically provided by Supabase
- **APP_URL**: Set via `supabase secrets set`
- **JWT_SECRET**: Set via `supabase secrets set`

## Security Best Practices

1. **Never commit secrets to git**
2. **Use different keys for different environments** (staging vs production)
3. **Rotate keys regularly**
4. **Monitor access logs**
5. **Use least privilege principle**

## Verification

After setting environment variables:

1. **Redeploy your site** to pick up new environment variables
2. **Check browser console** for any missing environment variable errors
3. **Test OAuth flow** to ensure redirects work correctly

## Troubleshooting

### Environment Variables Not Loading
- Ensure variables start with `VITE_` for frontend access
- Redeploy site after adding new variables
- Check variable names are exact (case-sensitive)

### OAuth Redirect Issues
- Verify `APP_URL` matches your Netlify site URL exactly
- Check that redirect URI in Google Console matches your Supabase function URL
- Ensure no trailing slash inconsistencies

### Supabase Connection Issues
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active and not paused
- Verify RLS policies allow your operations

## Next Steps

1. Set up environment variables in Netlify
2. Redeploy your site
3. Test the Google OAuth integration
4. Set up Google OAuth credentials in workspace settings
