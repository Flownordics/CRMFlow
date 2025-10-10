# CRMFlow User Integrations

This document describes the per-user integrations feature for Gmail Mail + Calendar in CRMFlow.

## Overview

The integrations system allows users to connect their personal Google accounts to enable:
- **Gmail**: Send emails directly from the user's Gmail account
- **Google Calendar**: Create and manage calendar events

## Database Schema

The `user_integrations` table stores integration credentials securely:

```sql
create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  kind text not null check (kind in ('gmail','calendar')),
  email text,
  account_id text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider, kind)
);
```

## Security Features

- **Row Level Security (RLS)**: Users can only access their own integrations
- **Token Encryption**: Access tokens are stored securely
- **Automatic Token Refresh**: Tokens are refreshed automatically before expiration
- **Scope Limitation**: Only necessary OAuth scopes are requested

## Setup Instructions

### 1. Database Migration

Run the SQL migration in Supabase:

```sql
-- The migration is in database/rpc_reorder_deal.sql
-- It creates the user_integrations table with proper constraints and RLS policies
```

### 2. Environment Variables

Add these to your Supabase Edge Functions environment:

```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/functions/v1/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

### 4. Edge Function Deployment

Deploy the `google-refresh` Edge Function:

```bash
supabase functions deploy google-refresh
```

## Usage

### Frontend Integration

The integrations are available in the Settings page under the "Integrations" section. Users can:

1. **Connect Gmail**: Click "Connect" to authorize Gmail access
2. **Connect Calendar**: Click "Connect" to authorize Calendar access
3. **View Status**: See connected accounts and granted permissions
4. **Disconnect**: Remove integrations at any time

### API Usage

```typescript
import { 
  useUserIntegrations, 
  useUserIntegration,
  refreshGoogleTokenIfNeeded 
} from '@/services/integrations';

// Get all integrations for current user
const { data: integrations } = useUserIntegrations();

// Get specific integration
const { data: gmailIntegration } = useUserIntegration('gmail');

// Refresh token if needed
await refreshGoogleTokenIfNeeded('gmail');
```

## OAuth Scopes

### Gmail Scopes
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify emails

### Calendar Scopes
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Manage events
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar

## Token Management

- **Access Tokens**: Short-lived (1 hour), used for API calls
- **Refresh Tokens**: Long-lived, used to get new access tokens
- **Automatic Refresh**: Tokens are refreshed 2 minutes before expiration
- **Edge Function**: Handles token refresh securely on the backend

## Security Considerations

1. **Token Storage**: Tokens are stored in the database with RLS protection
2. **Scope Minimization**: Only necessary scopes are requested
3. **User Isolation**: Users can only access their own integrations
4. **Secure Refresh**: Token refresh happens server-side via Edge Functions
5. **Audit Trail**: All connections and updates are timestamped

## Troubleshooting

### Common Issues

1. **"relation does not exist"**: Ensure the migration has been run
2. **OAuth errors**: Check Google Cloud Console credentials and redirect URIs
3. **Token refresh failures**: Verify Edge Function environment variables
4. **Permission denied**: Check RLS policies and user authentication

### Debug Mode

Enable debug logging in the browser console to see integration operations:

```typescript
// The service includes comprehensive error logging
console.log('[integrations] Operation details...');
```

## Future Enhancements

- **Microsoft 365 Integration**: Outlook and Teams integration
- **Slack Integration**: Team communication integration
- **Webhook Support**: Real-time integration updates
- **Analytics Dashboard**: Integration usage statistics
- **Bulk Operations**: Manage multiple integrations

## Support

For issues or questions about integrations:
1. Check the browser console for error messages
2. Verify database migration completion
3. Confirm environment variable configuration
4. Test Edge Function deployment
