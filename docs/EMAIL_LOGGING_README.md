# Email Logging Implementation

This document describes the implementation of outbound email logging for CRMFlow, which tracks all sent quote emails per user.

## Overview

The email logging system provides comprehensive tracking of all outbound emails sent through the system, including:
- Successfully sent emails
- Failed email attempts
- Email provider information
- Recipient details
- Timestamps and error messages

## Database Schema

### `email_logs` Table

```sql
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  related_type text not null check (related_type in ('quote','order','invoice')),
  related_id uuid not null,
  to_email text not null,
  cc_emails text[] default '{}',
  subject text not null,
  provider text not null,          -- 'gmail' | 'resend' | 'smtp'
  provider_message_id text,
  status text not null check (status in ('queued','sent','error')),
  error_message text,
  created_at timestamptz not null default now()
);
```

**Indexes:**
- `idx_email_logs_user_id` - For fast user-based queries
- `idx_email_logs_related_type_related_id` - For fast entity-based queries
- `idx_email_logs_created_at` - For time-based sorting

**RLS Policies:**
- Users can only view and insert their own email logs
- Row-level security ensures data isolation

## Edge Function Updates

### `send-quote` Function

The send-quote edge function has been updated to log all email activities:

**Success Logging:**
```typescript
// Log email activity
await supabase
    .from('email_logs')
    .insert({
        user_id: userId,
        related_type: 'quote',
        related_id: quoteId,
        to_email: to,
        cc_emails: cc || [],
        subject: emailSubject,
        provider: emailProvider,
        provider_message_id: emailResult?.id || emailResult?.messageId,
        status: 'sent'
    })
```

**Error Logging:**
```typescript
// Log email error
await supabase
    .from('email_logs')
    .insert({
        user_id: userId,
        related_type: 'quote',
        related_id: quoteId,
        to_email: to,
        cc_emails: cc || [],
        subject: emailSubject,
        provider: emailProvider,
        provider_message_id: null,
        status: 'error',
        error_message: emailResult.error
    })
```

## Client Service

### `src/services/emailLogs.ts`

Provides React Query hooks and functions for fetching email logs:

**Functions:**
- `listEmailLogs(params)` - List email logs with filtering and pagination
- `getQuoteEmailLogs(quoteId)` - Get email logs for a specific quote
- `getOrderEmailLogs(orderId)` - Get email logs for a specific order
- `getInvoiceEmailLogs(invoiceId)` - Get email logs for a specific invoice

**React Query Hooks:**
- `useEmailLogs(params)` - Hook for listing email logs
- `useQuoteEmailLogs(quoteId)` - Hook for quote email logs
- `useOrderEmailLogs(orderId)` - Hook for order email logs
- `useInvoiceEmailLogs(invoiceId)` - Hook for invoice email logs

## UI Components

### `src/components/quotes/EmailLogs.tsx`

A React component that displays email activity for quotes:

**Features:**
- Shows all email attempts (sent, error, queued)
- Displays email provider information
- Shows recipient details (to, cc)
- Error messages for failed attempts
- Timestamps for all activities
- Status badges and icons

**Integration:**
- Added to `QuoteEditor.tsx` below the totals section
- Automatically refreshes when new emails are sent
- Uses React Query for data fetching and caching

## Data Flow

1. **User sends quote email** via SendQuoteDialog
2. **Edge function processes** the email request
3. **Email is sent** via configured provider (Gmail, Resend, etc.)
4. **Result is logged** to `email_logs` table:
   - Success: `status = 'sent'` with provider message ID
   - Failure: `status = 'error'` with error message
5. **UI updates** to show new email log entry
6. **Quote status** is updated to 'sent' if successful

## Error Handling

The system logs errors in several scenarios:

1. **Provider Errors:** Gmail API failures, Resend API errors
2. **Configuration Errors:** Missing email provider setup
3. **Network Errors:** Connection failures, timeouts
4. **Validation Errors:** Invalid email addresses, missing fields

All errors are logged with descriptive messages and proper error categorization.

## Security

- **Row Level Security (RLS)** ensures users can only see their own email logs
- **User ID validation** prevents cross-user data access
- **Input validation** using Zod schemas
- **SQL injection protection** via Supabase client

## Monitoring and Analytics

The email logs provide insights into:

- **Email Success Rates:** Track delivery success vs. failures
- **Provider Performance:** Compare Gmail vs. Resend reliability
- **User Activity:** Monitor email sending patterns
- **Error Patterns:** Identify common failure causes
- **Delivery Times:** Track email processing performance

## Future Enhancements

Potential improvements for the email logging system:

1. **Email Templates:** Track which email templates are used
2. **Bounce Handling:** Log and track email bounces
3. **Open Tracking:** Monitor email open rates
4. **Click Tracking:** Track link clicks in emails
5. **Analytics Dashboard:** Visual representation of email metrics
6. **Webhook Integration:** Real-time notifications for email events

## Testing

The implementation includes comprehensive tests:

- **Service Tests:** Unit tests for email log functions
- **Schema Validation:** Zod schema validation tests
- **Error Handling:** Tests for various error scenarios
- **Mock Integration:** Proper mocking of Supabase client

Run tests with:
```bash
npm test -- src/services/__tests__/emailLogs.test.ts
```

## Deployment

To deploy the email logging system:

1. **Run SQL Migration:** Execute the `email_logs` table creation
2. **Update Edge Function:** Deploy the updated `send-quote` function
3. **Deploy Client Code:** Build and deploy the React application
4. **Verify Integration:** Test email sending and logging functionality

## Support

For issues or questions about the email logging system:

1. Check the database logs for any SQL errors
2. Verify RLS policies are correctly applied
3. Ensure the edge function has proper permissions
4. Check browser console for client-side errors
5. Review the test suite for expected behavior
