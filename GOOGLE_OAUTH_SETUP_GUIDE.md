# Google OAuth Setup Guide for CRMFlow

This guide will help you set up Google OAuth credentials to enable Gmail and Google Calendar integration in CRMFlow.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your CRMFlow Supabase project URL

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "CRMFlow Integrations")
5. Click "Create"

## Step 2: Enable Required APIs

1. In your new project, go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Gmail API** (for sending emails)
   - **Google Calendar API** (for calendar events)
3. Click "Enable" for each API

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: Your Company Name
   - User support email: Your email
   - Developer contact information: Your email
4. Click "Save and Continue" through the remaining steps

## Step 4: Configure OAuth Client

1. Application type: **Web application**
2. Name: "CRMFlow Gmail & Calendar Integration"
3. **Authorized redirect URIs**: Add this URL:
   ```
   https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-oauth-callback
   ```
   This is the exact callback URL for CRMFlow.

4. Click "Create"

## Step 5: Get Your Credentials

After creating the OAuth client, you'll see:
- **Client ID** (copy this)
- **Client Secret** (copy this)

**Important**: Keep these credentials secure and never share them publicly.

## Step 6: Configure in CRMFlow

1. Go to Settings > Connected Accounts in CRMFlow
2. Click "Connect" for either Gmail or Google Calendar
3. Enter your Google Client ID and Client Secret
4. Click "Connect" to start the OAuth flow
5. Authorize CRMFlow to access your Google account
6. You'll be redirected back to CRMFlow with the integration active

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Ensure the redirect URI in Google Cloud Console exactly matches your Supabase function URL
   - Check that your Supabase project ID is correct

2. **"API not enabled" error**
   - Make sure you've enabled both Gmail API and Google Calendar API
   - Wait a few minutes after enabling APIs before testing

3. **"OAuth consent screen not configured"**
   - Complete the OAuth consent screen setup in Google Cloud Console
   - Add your email as a test user if using external user type

4. **"Insufficient permissions" error**
   - Ensure you're using the correct Google account
   - Check that the account has access to Gmail and Calendar

### Security Best Practices

- Store credentials securely
- Use different OAuth clients for development and production
- Regularly rotate client secrets
- Monitor API usage in Google Cloud Console

## API Scopes

CRMFlow requests these scopes:
- **Gmail**: `https://www.googleapis.com/auth/gmail.send` (send emails only)
- **Calendar**: `https://www.googleapis.com/auth/calendar` (full calendar access)

## Support

If you continue to have issues:
1. Check the browser console for error messages
2. Verify your Supabase Edge Functions are deployed
3. Ensure your database migrations have been applied
4. Contact support with specific error messages

## Next Steps

After successful integration:
- Test sending a quote email via Gmail
- Create a test calendar event
- Configure default email templates
- Set up calendar sync preferences
