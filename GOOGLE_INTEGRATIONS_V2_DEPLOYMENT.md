# Google Integrations (BYOG) v2 - Deployment Guide

This guide covers the complete deployment of the Google Integrations v2 system for CRMFlow.

## Overview

The system implements end-to-end Google OAuth integration allowing users to connect their own Gmail and Google Calendar accounts via OAuth2. Credentials are stored per workspace, and tokens per user.

## Prerequisites

- Supabase project with Edge Functions enabled
- Google Cloud Console access
- Netlify or similar hosting for frontend

## 1. Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable billing if not already enabled

### 1.2 Enable APIs
1. Go to "APIs & Services" > "Library"
2. Search and enable:
   - Gmail API
   - Google Calendar API
   - Google+ API (for user info)

### 1.3 OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. App type: External
3. Fill in app information:
   - App name: Your CRM Name
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar`
5. Add test users (emails you want to connect)
6. Publish app (if needed)

### 1.4 Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: Web application
4. Name: CRMFlow Google Integration
5. Authorized redirect URIs:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-oauth-callback
   ```
6. Authorized JavaScript origins:
   ```
   https://YOUR_NETLIFY_DOMAIN.netlify.app
   ```
7. Copy Client ID and Client Secret

## 2. Supabase Edge Functions Deployment

### 2.1 Set Environment Variables
```bash
cd supabase/functions

# Set secrets in Supabase project
supabase secrets set APP_URL="https://YOUR_NETLIFY_DOMAIN.netlify.app"
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
supabase secrets set SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase secrets set JWT_SECRET="YOUR_STRONG_JWT_SECRET"
supabase secrets set GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
supabase secrets set GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
```

### 2.2 Deploy Functions
```bash
# Deploy all functions
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback
supabase functions deploy google-refresh
supabase functions deploy google-gmail-send
supabase functions deploy google-calendar-proxy
```

### 2.3 Verify Deployment
Check Supabase Dashboard > Edge Functions to ensure all functions are deployed and running.

## 3. Database Schema Verification

Ensure these tables exist in your Supabase project:

### 3.1 workspace_integrations
```sql
-- Should already exist from previous migrations
-- Contains: id, workspace_id, provider, kind, client_id, client_secret, redirect_uri
```

### 3.2 user_integrations
```sql
-- Should already exist from previous migrations
-- Contains: id, user_id, workspace_id, provider, kind, email, access_token, refresh_token, expires_at, scopes, last_synced_at
```

### 3.3 email_logs (optional)
```sql
-- For logging sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  quote_id uuid REFERENCES public.quotes(id),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  message_id text,
  provider text NOT NULL,
  status text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
```

## 4. Frontend Deployment

### 4.1 Environment Variables
Set in your Netlify environment:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 4.2 Build and Deploy
```bash
npm run build
# Deploy to Netlify or your hosting platform
```

## 5. Testing the Integration

### 5.1 Workspace Setup
1. Go to Settings > Integrations
2. Enter your Google OAuth credentials:
   - Client ID: From Google Cloud Console
   - Client Secret: From Google Cloud Console
   - Redirect URI: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-oauth-callback`
3. Save both Gmail and Calendar integrations

### 5.2 User Connection
1. Click "Connect Gmail" or "Connect Calendar"
2. Complete OAuth flow in popup
3. Verify connection status shows "Connected as your@email.com"

### 5.3 Test Gmail
1. Go to Quotes > Select a quote > Send
2. Fill in email details
3. Send email
4. Check email_logs table for success

### 5.4 Test Calendar
1. Go to Calendar > Create event
2. Enable "Sync with Google" (if implemented)
3. Check Google Calendar for created event

## 6. Troubleshooting

### 6.1 Common Issues

#### OAuth Popup Blocked
- Check browser popup blocker settings
- Verify authorized JavaScript origins in Google Console

#### "Invalid redirect_uri" Error
- Ensure redirect URI in Google Console exactly matches your Supabase function URL
- Check for trailing slashes or typos

#### "Missing authorization header" Error
- Verify user is authenticated
- Check Authorization header format: `Bearer <token>`

#### Function Deployment Failures
- Check Supabase function logs
- Verify environment variables are set correctly
- Ensure function code compiles without errors

### 6.2 Debug Steps
1. Check browser console for errors
2. Check Supabase function logs
3. Verify database tables and RLS policies
4. Test OAuth flow step by step

### 6.3 Logs to Check
- Browser console (frontend errors)
- Supabase Edge Function logs
- Database query logs
- Network tab for API calls

## 7. Security Considerations

### 7.1 OAuth Security
- Use strong JWT_SECRET
- Verify state parameter in callback
- Implement proper CORS headers
- Use service role only in edge functions

### 7.2 Data Protection
- Tokens stored encrypted in database
- RLS policies ensure users only access their data
- No sensitive data logged

### 7.3 Rate Limiting
- Consider implementing rate limiting on OAuth endpoints
- Monitor for abuse patterns

## 8. Monitoring and Maintenance

### 8.1 Regular Checks
- Monitor function execution times
- Check for expired tokens
- Review error logs
- Monitor API usage

### 8.2 Token Refresh
- System automatically refreshes expired tokens
- Monitor refresh failures
- Consider proactive refresh for critical integrations

### 8.3 Updates
- Keep Google APIs enabled
- Monitor for API deprecations
- Update scopes if needed

## 9. Support and Resources

### 9.1 Documentation
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API](https://developers.google.com/gmail/api)
- [Calendar API](https://developers.google.com/calendar/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### 9.2 Community
- Supabase Discord
- Google Cloud Community
- GitHub Issues

## 10. Rollback Plan

If issues arise:
1. Disable functions in Supabase Dashboard
2. Remove OAuth credentials from Google Console
3. Clear user_integrations table if needed
4. Restore previous email/calendar implementation

---

**Note**: This system replaces any existing Google integration. Ensure you have a backup plan before deployment.
