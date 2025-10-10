# Supabase Edge Functions - Secrets Configuration

This document contains the configuration values needed for the Google Integrations v2 system. Update the values below with your actual project details.

## Required Environment Variables

### 1. APP_URL
Your frontend application URL (Netlify domain or custom domain).

```bash
supabase secrets set APP_URL="https://crmflow-app.netlify.app/"
```

**Example:**
```bash
supabase secrets set APP_URL="https://crmflow-app.netlify.app/"
```

### 2. SUPABASE_URL
Your Supabase project URL (automatically provided by Supabase CLI).

**Note:** This is automatically set by Supabase CLI, no manual configuration needed.

### 3. JWT_SECRET
A strong, random secret for signing OAuth state tokens. Generate a secure random string.

```bash
supabase secrets set JWT_SECRET="d7MQR7lFqlXDxd22DDpMbXGO1cQItJTYmLWgk/gLlAdw1ZhmO1jh+lOTIZbPw4BbAiapjqfAddA2KA2sAvrjIg=="
```

**Example:**
```bash
supabase secrets set JWT_SECRET="d7MQR7lFqlXDxd22DDpMbXGO1cQItJTYmLWgk/gLlAdw1ZhmO1jh+lOTIZbPw4BbAiapjqfAddA2KA2sAvrjIg=="
```

## Complete Setup Commands

Copy and run these commands after updating with your actual values:

```bash
# Navigate to functions directory
cd supabase/functions

# Set required secrets (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically provided)
supabase secrets set APP_URL="https://crmflow-app.netlify.app/"
supabase secrets set JWT_SECRET="d7MQR7lFqlXDxd22DDpMbXGO1cQItJTYmLWgk/gLlAdw1ZhmO1jh+lOTIZbPw4BbAiapjqfAddA2KA2sAvrjIg=="
```
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback
supabase functions deploy google-refresh
supabase functions deploy google-gmail-send
supabase functions deploy google-calendar-proxy

## Google OAuth Credentials (BYOG - Bring Your Own Google)

**Important:** This system uses BYOG (Bring Your Own Google) architecture. Google OAuth credentials are NOT set as project-wide secrets. Instead:

1. **Each workspace admin** creates their own Google Cloud Console project
2. **Each workspace admin** configures their own OAuth credentials
3. **Each workspace admin** enters these credentials in Settings > Integrations
4. **Each user** connects their own Google account through the OAuth flow

### How Google Credentials Work:
- **Workspace Level**: Admin enters Google OAuth credentials in Settings > Integrations
- **User Level**: Each user connects their own Gmail/Calendar account
- **Storage**: Credentials stored in `workspace_integrations` table, user tokens in `user_integrations` table
- **Security**: Each workspace manages their own Google API quotas and permissions

### For Workspace Admins:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create your own project (or use existing)
3. Enable Gmail API and Calendar API
4. Create OAuth 2.0 credentials
5. Set redirect URI to: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-oauth-callback`
6. Enter Client ID and Client Secret in CRMFlow Settings > Integrations

## How to Find Your Values

### APP_URL
- Go to your Netlify dashboard
- Find your site URL in the site overview
- Use the full HTTPS URL

### SUPABASE_URL
- Go to your Supabase dashboard
- Navigate to Settings > API
- Copy the "Project URL"

### SERVICE_ROLE_KEY
- Go to your Supabase dashboard
- Navigate to Settings > API
- Copy the "service_role" key (not the anon key)
- ⚠️ **Keep this secret!** It has admin privileges

### JWT_SECRET
Generate a strong random string:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```


## Verification

After setting all secrets, verify they're configured correctly:

```bash
# List all secrets (values will be hidden)
supabase secrets list
```

You should see these secrets listed:
- APP_URL (manually set)
- JWT_SECRET (manually set)
- SUPABASE_URL (automatically provided by Supabase)
- SUPABASE_SERVICE_ROLE_KEY (automatically provided by Supabase)
- SUPABASE_ANON_KEY (automatically provided by Supabase)
- SUPABASE_DB_URL (automatically provided by Supabase)

**Note:** Google OAuth credentials are NOT stored as project secrets. They are configured per workspace through the Settings > Integrations UI.

## Security Notes

- ⚠️ **Never commit these values to version control**
- ⚠️ **The SERVICE_ROLE_KEY has admin access to your database**
- ⚠️ **The JWT_SECRET should be unique and strong**
- ⚠️ **Google credentials are stored per workspace in the database, not as project secrets**

## Troubleshooting

If you get errors when setting secrets:

1. **Check Supabase CLI is logged in:**
   ```bash
   supabase status
   ```

2. **Verify you're in the correct project:**
   ```bash
   supabase projects list
   ```

3. **Check secret names are exact:**
   - APP_URL (not APP_URLS)
   - SUPABASE_URL (not SUPABASE_URLS)
   - etc.

4. **Ensure values don't have extra quotes or spaces**

## Next Steps

After setting all secrets:

1. Deploy the edge functions:
   ```bash
   supabase functions deploy google-oauth-start
   supabase functions deploy google-oauth-callback
   supabase functions deploy google-refresh
   supabase functions deploy google-gmail-send
   supabase functions deploy google-calendar-proxy
   ```

2. Test the integration in your application

3. Check function logs if issues occur:
   ```bash
   supabase functions logs google-oauth-start
   ```
