# Gmail Integration Test Guide

## Prerequisites
1. Google OAuth credentials configured in environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

2. Supabase environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Test Steps

### 1. Test OAuth Callback
```bash
# Test the google-oauth-callback function
curl -X POST https://your-project.supabase.co/functions/v1/google-oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_auth_code",
    "userId": "user-uuid",
    "kind": "gmail",
    "googleClientId": "your-client-id",
    "googleClientSecret": "your-client-secret",
    "redirectUri": "http://localhost:3000/oauth/callback"
  }'
```

### 2. Test Token Refresh
```bash
# Test the google-refresh function
curl -X POST https://your-project.supabase.co/functions/v1/google-refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "kind": "gmail",
    "refreshToken": "test_refresh_token"
  }'
```

### 3. Test Send Quote
```bash
# Test the send-quote function
curl -X POST https://your-project.supabase.co/functions/v1/send-quote \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{
    "quoteId": "quote-uuid",
    "to": "test@example.com",
    "subject": "Test Quote",
    "body": "This is a test quote email",
    "userId": "user-uuid"
  }'
```

## Expected Results

### OAuth Callback
- Should return success with email and accountId
- Should handle missing refresh_token gracefully
- Should support reconsent flow

### Token Refresh
- Should refresh access token successfully
- Should handle expired refresh tokens with reconsent flag
- Should update integration record

### Send Quote
- Should send email with multipart/alternative MIME format
- Should handle 401 errors with automatic token refresh
- Should log to email_logs table
- Should update quote status to 'sent'
- Should create activity record if deal exists
- Should respect idempotency keys

## Database Verification

Check these tables after testing:

```sql
-- Check user integrations
SELECT * FROM user_integrations WHERE kind = 'gmail';

-- Check email logs
SELECT * FROM email_logs WHERE related_type = 'quote';

-- Check idempotency keys
SELECT * FROM idempotency_keys WHERE purpose = 'send_quote_email';

-- Check activities
SELECT * FROM activities WHERE type = 'email_sent';
```

## Error Scenarios to Test

1. **No Gmail Integration**: Should return 409 with EMAIL_NOT_CONNECTED
2. **Expired Access Token**: Should refresh automatically
3. **Expired Refresh Token**: Should return reconsent flag
4. **Duplicate Idempotency Key**: Should return success without sending
5. **Invalid Quote ID**: Should return 404
6. **Missing Required Fields**: Should return 400

## UI Testing

1. Open SendQuoteDialog
2. Verify "Sending as: {email}" is displayed when connected
3. Verify "Connect Gmail now" CTA when not connected
4. Test sending with valid data
5. Test error handling for various scenarios
