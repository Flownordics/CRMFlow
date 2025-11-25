# Fix Google OAuth "Access Blocked" Error

## Problem
When users try to connect Gmail or Calendar, they see:
```
Access blocked: rgimekaxpmqqlqulhpgt.supabase.co has not completed the Google verification process
Error 403: access_denied
```

## Cause
The Google OAuth consent screen is in "Testing" mode, which means only developer-approved test users can access the app.

## Solution

### Option 1: Add Test Users (Quick Fix - For Development)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Scroll down to **Test users** section
4. Click **+ ADD USERS**
5. Add the email addresses of users who need access:
   - `dennis@flownordics.com`
   - Any other users who need to connect
6. Click **ADD**
7. Users can now connect their accounts

**Note:** This is a temporary solution for development. For production, you should publish the app.

### Option 2: Publish the App (For Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Ensure all required fields are filled:
   - App name
   - User support email
   - Developer contact information
   - App domain (if applicable)
   - Authorized domains
   - Scopes (Gmail and Calendar APIs)
4. Scroll to the bottom
5. Click **PUBLISH APP**
6. Review and confirm the publishing

**Important:** Publishing requires:
- App verification if using sensitive scopes
- Privacy policy URL
- Terms of service URL (may be required)
- App domain verification

### Option 3: Use Internal App Type (For G Suite/Workspace)

If you're using Google Workspace:
1. Go to **OAuth consent screen**
2. Change **User Type** from **External** to **Internal**
3. Only users in your Google Workspace can access
4. No verification needed

## Verification Checklist

After adding test users or publishing:

- [ ] User email added to test users list (if in Testing mode)
- [ ] OAuth consent screen published (if for production)
- [ ] Redirect URI matches exactly: `https://rgimekaxpmqqlqulhpgt.supabase.co/functions/v1/google-oauth-callback`
- [ ] Gmail API enabled
- [ ] Google Calendar API enabled
- [ ] Required scopes added:
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/userinfo.email`

## Testing

1. User should clear browser cache/cookies
2. Try connecting Gmail/Calendar again
3. Should see Google OAuth consent screen (not blocked message)
4. User grants permissions
5. Connection should succeed

## Common Issues

### Still Getting Blocked After Adding Test User
- Wait 5-10 minutes for changes to propagate
- Clear browser cache
- Try incognito/private window
- Verify email is spelled correctly in test users list

### App Verification Required
If Google requires app verification:
- Complete the verification process
- Provide privacy policy URL
- Provide terms of service URL
- May take several days for Google to review

## Current Status

Based on the error, your app is in **Testing** mode. The quickest fix is to add `dennis@flownordics.com` (and any other users) to the test users list in Google Cloud Console.

