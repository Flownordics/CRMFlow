# Google OAuth User Credentials Setup

## Overview

This CRM system now supports **user-specific Google OAuth credentials**, allowing each user to integrate their own Google accounts for Gmail and Calendar functionality without requiring admin configuration.

## How It Works

### Before (Environment Variables)
- All users shared the same Google OAuth credentials
- Required admin to configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables
- Limited flexibility and security concerns

### After (User-Specific Credentials)
- Each user enters their own Google OAuth credentials directly in the app
- Credentials are stored securely in the database per user
- No admin configuration required
- Better security and user autonomy

## Setup Instructions for Users

### 1. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Gmail API** (for email functionality)
   - **Google Calendar API** (for calendar functionality)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - `https://your-project.supabase.co/functions/v1/google-oauth-callback`
   - `http://localhost:54321/functions/v1/google-oauth-callback` (for local development)

### 2. Get Your Credentials

After creating the OAuth application, you'll receive:
- **Client ID**: A long string ending with `.apps.googleusercontent.com`
- **Client Secret**: A shorter string (keep this secure)

### 3. Configure in CRM

1. Log into your CRM account
2. Go to **Settings** → **Integrations**
3. Click **Connect** for either Gmail or Google Calendar
4. Enter your Google OAuth Client ID and Client Secret
5. Click **Connect** to start the OAuth flow
6. You'll be redirected to Google to authorize the app
7. After authorization, you'll be redirected back to the CRM

## Security Features

### Credential Storage
- Credentials are encrypted and stored securely in the database
- Each user's credentials are isolated and private
- Credentials are only accessible to the authenticated user

### OAuth Flow Security
- Uses PKCE (Proof Key for Code Exchange) for enhanced security
- Implements proper state parameter validation
- Secure token storage and refresh mechanisms

### Access Control
- Row Level Security (RLS) ensures users can only access their own integrations
- Credentials are never exposed in logs or error messages
- Automatic token refresh with secure credential handling

## Supported Integrations

### Gmail Integration
- **Scope**: `https://www.googleapis.com/auth/gmail.send`
- **Functionality**: Send emails directly from your Gmail account
- **Use Cases**: Sending quotes, invoices, and other business communications

### Google Calendar Integration
- **Scope**: `https://www.googleapis.com/auth/calendar`
- **Functionality**: Create and manage calendar events
- **Use Cases**: Scheduling meetings, tracking appointments, managing business calendar

## Troubleshooting

### Common Issues

#### "Missing authorization header" Error
- **Cause**: User not properly authenticated
- **Solution**: Log out and log back in, then try connecting again

#### "Google OAuth credentials not provided" Error
- **Cause**: Credentials not entered or invalid
- **Solution**: Double-check your Client ID and Client Secret, ensure they're copied correctly

#### "No refresh token received" Error
- **Cause**: Google didn't provide a refresh token
- **Solution**: Ensure you're using the correct redirect URI and have granted offline access

#### "Failed to exchange authorization code" Error
- **Cause**: Invalid or expired authorization code
- **Solution**: Try the connection process again from the beginning

### Getting Help

1. **Check Credentials**: Verify your Google OAuth Client ID and Secret are correct
2. **Check Redirect URIs**: Ensure your Google OAuth app has the correct redirect URIs
3. **Check API Access**: Verify Gmail and/or Calendar APIs are enabled in your Google Cloud project
4. **Clear Browser Data**: Try clearing cookies and local storage, then reconnect
5. **Contact Support**: If issues persist, contact your CRM administrator

## Migration from Environment Variables

If you were previously using environment variable-based Google OAuth:

1. **Existing Integrations**: Will continue to work using environment variables as fallback
2. **New Integrations**: Will use user-provided credentials
3. **Upgrade Path**: Users can reconnect their integrations to use their own credentials

## Best Practices

### For Users
- Use separate Google OAuth applications for different environments (dev, staging, production)
- Regularly rotate your OAuth credentials for security
- Monitor your Google Cloud Console for any unusual activity
- Use strong, unique passwords for your Google account

### For Administrators
- Monitor integration usage and any failed authentication attempts
- Ensure proper backup and recovery procedures for user data
- Consider implementing additional security measures if needed
- Provide clear documentation and support for users

## Technical Details

### Database Schema
```sql
ALTER TABLE user_integrations 
ADD COLUMN google_client_id TEXT,
ADD COLUMN google_client_secret TEXT;
```

### API Endpoints
- `POST /functions/v1/google-oauth-start` - Start OAuth flow with user credentials
- `POST /functions/v1/google-oauth-callback` - Handle OAuth callback and store credentials
- `POST /functions/v1/google-refresh` - Refresh tokens using stored credentials

### Token Management
- Access tokens are automatically refreshed when expired
- Refresh tokens are securely stored and used for token renewal
- Failed refresh attempts trigger re-authentication flows

## Support

For technical support or questions about this implementation:
- Check the troubleshooting section above
- Review Google OAuth documentation
- Contact your CRM administrator
- Open an issue in the project repository

---

**Note**: This implementation follows Google OAuth 2.0 best practices and provides a secure, user-friendly way to integrate Google services with your CRM system.
