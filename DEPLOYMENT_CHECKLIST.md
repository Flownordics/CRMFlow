# 🚀 Google OAuth Deployment Checklist

## ✅ Pre-Deployment

### 1. Environment Variables Set in Supabase Dashboard
Go to: **Supabase Dashboard → Settings → Edge Functions → Environment Variables**

- [ ] `GOOGLE_CLIENT_ID` = `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- [ ] `GOOGLE_CLIENT_SECRET` = `YOUR_GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI` = `https://YOUR_PROJECT.supabase.co/functions/v1/google-oauth-callback`
- [ ] `ENCRYPTION_KEY` = `YOUR_32_BYTE_ENCRYPTION_KEY`
- [ ] `APP_URL` = `https://your-frontend-domain.com`
- [ ] `JWT_SECRET` = `YOUR_JWT_SECRET`

### 2. Google Cloud Console Configuration
Go to: **https://console.cloud.google.com/apis/credentials**

- [ ] Gmail API is enabled
- [ ] Google Calendar API is enabled
- [ ] OAuth 2.0 Client ID created (Web application)
- [ ] Authorized redirect URI added: `https://rgimekaxpmqqlqulhpgt.supabase.co/functions/v1/google-oauth-callback`

---

## 🚀 Deployment

### Deploy Edge Functions

**Option A: Using PowerShell Script (Recommended)**
```powershell
# 1. Get access token from: https://supabase.com/dashboard/account/tokens
$env:SUPABASE_ACCESS_TOKEN="your-token-here"

# 2. Run deployment
.\deploy-google-functions.ps1
```

**Option B: Manual Deployment**
```powershell
npx supabase functions deploy google-oauth-start --no-verify-jwt
npx supabase functions deploy google-oauth-callback --no-verify-jwt
npx supabase functions deploy google-refresh --no-verify-jwt
npx supabase functions deploy google-gmail-send --no-verify-jwt
npx supabase functions deploy google-calendar-proxy --no-verify-jwt
```

**Functions to Deploy:**
- [ ] `google-oauth-start`
- [ ] `google-oauth-callback`
- [ ] `google-refresh`
- [ ] `google-gmail-send`
- [ ] `google-calendar-proxy`

---

## ✅ Post-Deployment Testing

### 1. Run Test Script
```powershell
.\test-google-oauth.ps1
```

Expected: All functions should be accessible (✅)

### 2. Test OAuth Flow - Gmail

1. [ ] Navigate to: https://crmflow-app.netlify.app/settings
2. [ ] Click **"Integrations"** tab
3. [ ] See the blue banner about Google integration update (can dismiss it)
4. [ ] Click **"Connect Gmail"** button
5. [ ] Redirected to Google OAuth consent screen
6. [ ] Select your Google account
7. [ ] Click **"Allow"** to grant permissions
8. [ ] Redirected back to your app
9. [ ] See **"Connected as [your-email@gmail.com]"** in Settings
10. [ ] Badge shows **"Connected"** in green

### 3. Test OAuth Flow - Calendar

1. [ ] In Settings → Integrations
2. [ ] Click **"Connect Calendar"** button
3. [ ] Authorize with Google account
4. [ ] See **"Connected as [your-email@gmail.com]"**
5. [ ] Badge shows **"Connected"** in green

### 4. Test Gmail Send Functionality

1. [ ] Navigate to Quotes or Invoices
2. [ ] Create or open a quote/invoice
3. [ ] Click **"Send via Email"** button
4. [ ] Email dialog shows: **"Sending as [your-email@gmail.com]"**
5. [ ] Enter recipient email
6. [ ] Click **"Send"**
7. [ ] Success message appears
8. [ ] **Check recipient's inbox** - email should arrive
9. [ ] **Check "From" address** - should be YOUR Gmail, not app owner's

### 5. Test Calendar Sync Functionality

1. [ ] Navigate to Calendar view
2. [ ] Click **"New Event"** button
3. [ ] Fill in event details:
   - Title: "Test OAuth Event"
   - Start time: Tomorrow at 10:00 AM
   - End time: Tomorrow at 11:00 AM
4. [ ] Click **"Create"**
5. [ ] Event appears in CRM calendar
6. [ ] **Open your Google Calendar** (calendar.google.com)
7. [ ] Verify event appears there too
8. [ ] Edit event in CRM → changes sync to Google
9. [ ] Delete event in CRM → removed from Google

### 6. Verify Token Encryption

```sql
-- Run in Supabase SQL Editor
SELECT 
  user_id,
  kind,
  email,
  LENGTH(access_token) as token_length,
  LENGTH(refresh_token) as refresh_length,
  expires_at > NOW() as is_valid
FROM user_integrations
WHERE provider = 'google'
ORDER BY created_at DESC;

-- ✅ Expected: token_length should be 200+ characters (encrypted)
-- ❌ If 150-180 characters, tokens are not encrypted (check ENCRYPTION_KEY)
```

### 7. Test Token Refresh

1. [ ] Wait a few minutes
2. [ ] Send another email or create calendar event
3. [ ] Should work without re-authentication
4. [ ] Check Edge Function logs: should see "Token refreshed successfully" if it was near expiration

### 8. Test Multiple Users (if available)

1. [ ] Have a second user connect their Gmail
2. [ ] First user sends email → sent from first user's Gmail
3. [ ] Second user sends email → sent from second user's Gmail
4. [ ] ✅ Emails correctly sent from respective user accounts

---

## 🐛 Troubleshooting

### Issue: "No OAuth credentials configured"

**Symptoms:** Error when clicking "Connect Gmail/Calendar"

**Fix:**
1. Check environment variables are set in Supabase Dashboard
2. Redeploy Edge Functions
3. Clear browser cache and try again

### Issue: "redirect_uri_mismatch"

**Symptoms:** Error from Google after clicking "Allow"

**Fix:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Verify redirect URI is EXACTLY: `https://rgimekaxpmqqlqulhpgt.supabase.co/functions/v1/google-oauth-callback`
4. Save and try again

### Issue: Email sent but "From" is wrong address

**Symptoms:** Email sent from app owner's address instead of user's

**Fix:**
1. This shouldn't happen with the new implementation
2. Disconnect and reconnect Gmail integration
3. Check Edge Function logs for errors
4. Verify user has their own `user_integrations` record

### Issue: Tokens not encrypted in database

**Symptoms:** Token length in DB is 150-180 characters

**Fix:**
1. Verify `ENCRYPTION_KEY` is set in Supabase environment variables
2. Redeploy Edge Functions
3. Users must disconnect and reconnect to get encrypted tokens

### Issue: "Token refresh failed"

**Symptoms:** Errors after ~1 hour of first connection

**Fix:**
1. Check if `refresh_token` exists in `user_integrations` table
2. If missing, user needs to reconnect (with `prompt=consent`)
3. Check `GOOGLE_CLIENT_SECRET` is correct in environment variables

---

## 📊 Monitoring

### Check Edge Function Logs

**Via Dashboard:**
1. Go to: Supabase Dashboard → Edge Functions
2. Click on a function (e.g., `google-oauth-callback`)
3. Click **"Logs"** tab
4. Look for errors or warnings

**Via CLI:**
```powershell
npx supabase functions logs google-oauth-callback --follow
```

### Check Integration Status (SQL)

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

## ✅ Success Criteria

All of these should be ✅:

- [ ] All 5 Edge Functions deployed successfully
- [ ] Environment variables set in Supabase
- [ ] Google Cloud Console redirect URI configured
- [ ] Can connect Gmail via OAuth
- [ ] Can connect Calendar via OAuth
- [ ] Email sent from user's own Gmail address
- [ ] Calendar events sync to user's Google Calendar
- [ ] Tokens are encrypted (200+ characters in DB)
- [ ] Token refresh works automatically
- [ ] Multiple users can connect independently

---

## 🎉 You're Done!

If all tests pass, your centralized Google OAuth is fully operational!

**What Changed:**
- ✅ No more manual credential entry
- ✅ Centralized OAuth app
- ✅ Encrypted tokens at rest
- ✅ Emails from user's own Gmail
- ✅ Calendar sync to user's own calendar

**Next Steps:**
1. Monitor Edge Function logs for any errors
2. Ask users to reconnect if they see the blue banner
3. Enjoy simplified Google integration! 🚀

---

**Need Help?**
- Check `GOOGLE_OAUTH_MIGRATION_GUIDE.md` for detailed troubleshooting
- Review Edge Function logs in Supabase Dashboard
- Check this deployment checklist for missed steps

