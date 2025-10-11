# Google OAuth Migration Guide
## From Per-User Credentials → Centralized OAuth

---

## 📋 Overview

This guide documents the migration from a BYOG (Bring Your Own Google) credentials model to a centralized OAuth application model for Google Calendar and Gmail integration.

### **Before (Old Model)**
- Each workspace provided their own Google OAuth `client_id` and `client_secret`
- Credentials stored in `workspace_integrations` table
- Required users to create and configure their own Google Cloud projects

### **After (New Model)**
- Single centralized Google OAuth app controlled by the application owner
- Credentials configured via environment variables
- Each user connects their own Google account via OAuth
- Emails sent from user's own Gmail address (not app owner's)
- Tokens encrypted at rest using AES-256-GCM

---

## 🎯 What Changed

### **1. Environment Variables (Required)**
```bash
# Google OAuth Credentials (from your Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-app.supabase.co/functions/v1/google-oauth-callback

# Token Encryption (generate a 32+ character random string)
ENCRYPTION_KEY=your-32-byte-encryption-key-here
```

### **2. Edge Functions Updated**
All Supabase Edge Functions now use centralized credentials:
- ✅ `google-oauth-start` - Uses `GOOGLE_CLIENT_ID` from env
- ✅ `google-oauth-callback` - Uses centralized credentials + encrypts tokens
- ✅ `google-refresh` - Uses centralized credentials + decrypts tokens
- ✅ `google-gmail-send` - Decrypts user tokens automatically
- ✅ `google-calendar-proxy` - Decrypts user tokens automatically

### **3. Frontend Changes**
- ❌ Removed `WorkspaceIntegrationsForm` component (no longer needed)
- ✅ Enhanced `ConnectedAccounts` component (already existed)
- ✅ Added `ReconnectGoogleBanner` for migration notifications

### **4. Database**
- `user_integrations` table unchanged (already perfect for per-user tokens)
- `workspace_integrations` table deprecated (but not removed for backwards compatibility)
- Tokens are now encrypted before storage (backwards compatible with plaintext)

### **5. Service Layer**
- Deprecated workspace credential functions
- All user integration functions remain unchanged and work perfectly

---

## 🚀 Migration Steps

### **Step 1: Configure Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
4. Create OAuth 2.0 Credentials:
   - Application type: Web application
   - Add Authorized redirect URIs:
     ```
     https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/google-oauth-callback
     ```
   - For local development, also add:
     ```
     http://localhost:54321/functions/v1/google-oauth-callback
     ```
5. Copy the `Client ID` and `Client Secret`

### **Step 2: Configure Supabase Environment Variables**

Set these environment variables in your Supabase project:

```bash
# Via Supabase Dashboard:
# Settings → Edge Functions → Environment Variables

GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://YOUR_PROJECT.supabase.co/functions/v1/google-oauth-callback
```

Generate a secure encryption key:
```bash
# Generate a random 32-byte key (use one of these methods)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# OR
openssl rand -hex 32
# OR
python -c "import secrets; print(secrets.token_hex(32))"
```

Then set it:
```bash
ENCRYPTION_KEY=your_generated_key_here
```

### **Step 3: Update Local Development**

For local development with Supabase CLI, create/update `.env`:

```bash
# .env (for local Supabase functions)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:54321/functions/v1/google-oauth-callback
ENCRYPTION_KEY=your_encryption_key
APP_URL=http://localhost:5173
JWT_SECRET=your-jwt-secret
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Step 4: Deploy Edge Functions**

Deploy the updated Edge Functions to Supabase:

```bash
# Deploy all functions
supabase functions deploy google-oauth-start
supabase functions deploy google-oauth-callback
supabase functions deploy google-refresh
supabase functions deploy google-gmail-send
supabase functions deploy google-calendar-proxy

# Or deploy all at once
supabase functions deploy
```

### **Step 5: Deploy Frontend**

Deploy your updated frontend application with the removed `WorkspaceIntegrationsForm` component.

### **Step 6: Notify Users**

Users will see the `ReconnectGoogleBanner` when they visit Settings. The banner:
- ✅ Appears automatically for users without connected integrations
- ✅ Can be dismissed (stored in localStorage)
- ✅ Explains the new OAuth model
- ✅ Prompts users to reconnect

---

## 🔒 Security Improvements

### **Token Encryption**

All OAuth tokens (access_token, refresh_token) are now encrypted using AES-256-GCM:

- **Encryption**: Tokens are encrypted before being stored in the database
- **Decryption**: Tokens are automatically decrypted when retrieved
- **Backwards Compatible**: If encryption fails, falls back to plaintext (for migration period)
- **Key Management**: Encryption key stored in environment variables (never in code)

### **Scopes**

The OAuth scopes requested are:

**Gmail:**
```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
```

**Calendar:**
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/userinfo.email
```

---

## 🧪 Testing

### **1. Test OAuth Flow**

```bash
# 1. Navigate to Settings → Integrations
# 2. Click "Connect Gmail" or "Connect Calendar"
# 3. Authorize with your Google account
# 4. Verify successful connection (shows your email)
```

### **2. Test Gmail Send**

```bash
# 1. Create a quote or invoice
# 2. Click "Send via Email"
# 3. Verify email is sent from YOUR Gmail address (not app owner's)
# 4. Check recipient receives the email
```

### **3. Test Calendar Sync**

```bash
# 1. Navigate to Calendar
# 2. Create an event
# 3. Verify it appears in your Google Calendar
# 4. Edit/delete in CRM and verify sync to Google
```

### **4. Test Token Refresh**

```bash
# Wait for token to approach expiration (or force refresh)
# Tokens should automatically refresh without user intervention
# Verify no errors in browser console or Edge Function logs
```

---

## 🐛 Troubleshooting

### **"No OAuth credentials configured"**

**Cause:** Environment variables not set in Supabase

**Solution:**
1. Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables
2. Verify `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` are set
3. Redeploy Edge Functions: `supabase functions deploy`

### **"redirect_uri_mismatch"**

**Cause:** Redirect URI in Google Cloud Console doesn't match the one in your environment variables

**Solution:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client
3. Add the exact URI from your `GOOGLE_REDIRECT_URI` environment variable
4. Example: `https://abcdefghij.supabase.co/functions/v1/google-oauth-callback`

### **"Token encryption failed"**

**Cause:** `ENCRYPTION_KEY` environment variable not set

**Solution:**
1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Set it in Supabase: `ENCRYPTION_KEY=your_key`
3. Redeploy Edge Functions

### **Emails not sending / Calendar not syncing**

**Cause:** User tokens not refreshed or corrupted

**Solution:**
1. Disconnect the integration in Settings
2. Reconnect with fresh OAuth flow
3. Verify token expiration is set correctly
4. Check Edge Function logs for errors

---

## 📊 Monitoring

### **Check Edge Function Logs**

```bash
# Via Supabase Dashboard:
# Edge Functions → Select function → Logs

# Via CLI:
supabase functions logs google-oauth-callback
supabase functions logs google-refresh
```

### **Verify Token Encryption**

```sql
-- Check if tokens are encrypted (encrypted tokens are longer)
SELECT 
  user_id,
  kind,
  email,
  LENGTH(access_token) as token_length,
  expires_at,
  created_at
FROM user_integrations
WHERE provider = 'google';

-- Encrypted tokens should be 200+ characters
-- Plaintext tokens are typically 150-180 characters
```

### **Check Integration Status**

```sql
-- See all connected users
SELECT 
  ui.user_id,
  ui.kind,
  ui.email,
  ui.expires_at,
  ui.last_synced_at,
  au.email as user_email
FROM user_integrations ui
JOIN auth.users au ON ui.user_id = au.id
WHERE ui.provider = 'google'
  AND ui.access_token IS NOT NULL
ORDER BY ui.updated_at DESC;
```

---

## 🔄 Rollback Plan (If Needed)

If you need to rollback to the old BYOG model:

1. **Restore `WorkspaceIntegrationsForm`** component:
   ```bash
   git checkout HEAD~1 -- src/components/settings/WorkspaceIntegrationsForm.tsx
   ```

2. **Revert Edge Functions**:
   ```bash
   git checkout HEAD~1 -- supabase/functions/
   supabase functions deploy
   ```

3. **Restore Settings Page**:
   ```bash
   git checkout HEAD~1 -- src/pages/settings/SettingsPage.tsx
   ```

4. **Remove environment variables** (optional):
   - Keep `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` for future migration
   - Remove `ENCRYPTION_KEY` if not using encryption

---

## ✅ Post-Migration Checklist

- [ ] Google Cloud Console configured with correct redirect URIs
- [ ] Environment variables set in Supabase (all 4 required vars)
- [ ] Edge Functions deployed with new code
- [ ] Frontend deployed with updated UI
- [ ] Test OAuth flow for Gmail
- [ ] Test OAuth flow for Calendar  
- [ ] Test email sending (verify sent from user's Gmail)
- [ ] Test calendar sync (verify events sync to user's calendar)
- [ ] Monitor Edge Function logs for errors
- [ ] Verify token encryption is working (check token lengths in DB)
- [ ] Notify users via the banner or email
- [ ] Document the new OAuth flow in user documentation

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Web Crypto API (for encryption)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

## 🆘 Support

If you encounter issues during migration:

1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set correctly
3. Check browser console for frontend errors
4. Review Google Cloud Console audit logs
5. Consult this guide's Troubleshooting section

---

**Migration Date:** [Your date here]  
**Migrated By:** [Your name/team]  
**Version:** 1.0.0

