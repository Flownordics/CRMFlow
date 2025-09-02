# Google OAuth Testing Guide

## 🚀 Implementation Status

✅ **Completed Components:**
- Database schema (`user_integrations` table)
- Edge Functions deployed to Supabase
- OAuth service (`src/services/oauth.ts`)
- UI components (`IntegrationsForm`)
- OAuth callback route (`/oauth/google/callback`)
- TypeScript types and interfaces

## 🧪 Testing the OAuth Flow

### Prerequisites

1. **Google OAuth Credentials**: You need a Google OAuth 2.0 Client ID and Client Secret
2. **Development Server**: Run `npm run dev` to start the local server
3. **Supabase Project**: Edge Functions are deployed to `vziwouylxsfbummcvckx`

### Step-by-Step Testing

#### 1. Navigate to Settings → Integrations

1. Start the development server: `npm run dev`
2. Open your browser and go to `http://localhost:3000`
3. Navigate to Settings → Integrations
4. You should see two integration cards:
   - **Gmail**: Send emails directly from your Gmail account
   - **Google Calendar**: Create and manage calendar events

#### 2. Test Gmail Integration

1. Click the **"Connect"** button for Gmail
2. A credentials form should appear with:
   - Google Client ID input field
   - Google Client Secret input field (password type)
   - Connect and Cancel buttons

3. **Enter your Google OAuth credentials:**
   - **Client ID**: Your Google OAuth 2.0 Client ID
   - **Client Secret**: Your Google OAuth 2.0 Client Secret

4. Click **"Connect"**
5. You should be redirected to Google's OAuth consent screen
6. After authorization, you'll be redirected back to `/oauth/google/callback`
7. The callback page should show success and redirect to Settings

#### 3. Test Calendar Integration

1. Repeat the same process for Google Calendar
2. The flow should be identical but with calendar scopes

#### 4. Verify Database Storage

1. Check your Supabase dashboard → Database → Tables → `user_integrations`
2. You should see new records with:
   - `user_id`: Your authenticated user ID
   - `provider`: "google"
   - `kind`: "gmail" or "calendar"
   - `email`: Your Google account email
   - `google_client_id`: Your provided Client ID
   - `google_client_secret`: Your provided Client Secret
   - `access_token`: OAuth access token
   - `refresh_token`: OAuth refresh token
   - `expires_at`: Token expiration timestamp

#### 5. Test Disconnect Functionality

1. For connected integrations, click **"Disconnect"**
2. The integration should be removed from the database
3. The UI should revert to showing the "Connect" button

## 🔧 Edge Function Testing

### Manual Testing

You can test the Edge Functions directly:

```bash
# Test google-oauth-start
curl "https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-oauth-start?kind=gmail"

# Test google-oauth-callback (requires valid JWT)
curl -X POST "https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-oauth-callback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"code":"test","userId":"test","kind":"gmail","googleClientId":"test","googleClientSecret":"test","redirectUri":"http://localhost:3000/callback"}'

# Test google-refresh (requires valid JWT)
curl -X POST "https://vziwouylxsfbummcvckx.supabase.co/functions/v1/google-refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"userId":"test","kind":"gmail","refreshToken":"test"}'
```

### Expected Responses

- **google-oauth-start**: 302 redirect to Google OAuth
- **google-oauth-callback**: 200 with success message or 400 with error
- **google-refresh**: 200 with new token data or 400 with error

## 🐛 Troubleshooting

### Common Issues

1. **"User not authenticated"**
   - Ensure you're logged into the app
   - Check if Supabase auth is working

2. **"No OAuth session found"**
   - The OAuth flow was interrupted
   - Try the connection process again

3. **"OAuth session expired"**
   - The temporary credentials expired (10-minute limit)
   - Re-enter your credentials

4. **Edge Function errors**
   - Check Supabase dashboard → Functions → Logs
   - Verify environment variables are set correctly

5. **Database errors**
   - Check if `user_integrations` table exists
   - Verify RLS policies are correct

### Debug Steps

1. **Check browser console** for JavaScript errors
2. **Check Network tab** for failed requests
3. **Check Supabase logs** for Edge Function errors
4. **Verify database schema** matches expected structure

## 🔒 Security Considerations

1. **Credentials Storage**: Google credentials are stored in the database (encrypted at rest by Supabase)
2. **Token Security**: Access tokens are stored securely with RLS policies
3. **Scope Limitation**: Only necessary scopes are requested:
   - Gmail: `https://www.googleapis.com/auth/gmail.send`
   - Calendar: `https://www.googleapis.com/auth/calendar`
4. **PKCE**: OAuth flow uses PKCE for enhanced security

## 📱 Next Steps

After successful testing:

1. **Production Deployment**: Deploy to production environment
2. **Error Handling**: Add comprehensive error handling and user feedback
3. **Token Refresh**: Implement automatic token refresh logic
4. **Monitoring**: Add logging and monitoring for OAuth flows
5. **User Experience**: Improve loading states and success/error messages

## 🎯 Success Criteria

✅ **Integration connects successfully**
✅ **User credentials stored securely**
✅ **OAuth tokens obtained and stored**
✅ **User email displayed in UI**
✅ **Disconnect functionality works**
✅ **Database records created correctly**
✅ **Edge Functions respond as expected**

---

**Note**: This implementation follows Google OAuth 2.0 best practices and stores user-provided credentials as requested. Each user manages their own Google OAuth application credentials.
