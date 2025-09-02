# Email Setup for CRMFlow

This document explains how to set up and use the email functionality for sending quotes.

## Overview

The email system consists of:
- **Edge Function**: `supabase/functions/send-quote/index.ts` - Handles email sending with idempotency
- **Client Service**: `src/services/email.ts` - React hooks and API calls
- **UI Component**: `src/components/quotes/SendQuoteDialog.tsx` - Send quote dialog
- **Integration**: Added to `src/pages/quotes/QuoteEditor.tsx`

## Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration
VITE_EMAIL_PROVIDER=resend          # or 'smtp' or 'console'
VITE_EMAIL_FROM=sales@yourdomain.com
VITE_RESEND_API_KEY=your_resend_api_key
VITE_PUBLIC_APP_URL=http://localhost:8080

# Required Supabase config
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Email Providers

### 1. Resend (Recommended)
- Modern email API with excellent deliverability
- Free tier: 3,000 emails/month
- Setup: https://resend.com

```bash
VITE_EMAIL_PROVIDER=resend
VITE_EMAIL_FROM=sales@yourdomain.com
VITE_RESEND_API_KEY=re_123...
```

### 2. SMTP
- Traditional SMTP server
- Configure your own SMTP server details
- Not yet implemented (placeholder)

```bash
VITE_EMAIL_PROVIDER=smtp
VITE_EMAIL_FROM=sales@yourdomain.com
# Add SMTP config when implemented
```

### 3. Console (Development)
- Logs emails to console
- Always available as fallback
- Useful for development/testing

```bash
VITE_EMAIL_PROVIDER=console
# or omit VITE_EMAIL_PROVIDER entirely
```

## Database Requirements

The system requires these tables (already in schema.sql):

```sql
-- Idempotency keys for preventing duplicate emails
create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,             -- 'send_quote_email'
  external_key text not null,        -- header value
  entity_type text not null,         -- 'quote'
  entity_id uuid,                    -- quote id
  created_at timestamptz not null default now(),
  unique (purpose, external_key)
);

-- Activities for tracking email sends
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,                -- 'email_sent'
  deal_id uuid references public.deals(id),
  user_id uuid,
  meta jsonb,                        -- {quoteId, to, provider, subject}
  created_at timestamptz not null default now()
);
```

## Edge Function Deployment

1. **Deploy to Supabase**:
   ```bash
   supabase functions deploy send-quote
   ```

2. **Set environment variables**:
   ```bash
   supabase secrets set VITE_EMAIL_PROVIDER=resend
   supabase secrets set VITE_EMAIL_FROM=sales@yourdomain.com
   supabase secrets set VITE_RESEND_API_KEY=your_key
   supabase secrets set VITE_PUBLIC_APP_URL=https://yourapp.com
   ```

3. **Verify deployment**:
   ```bash
   supabase functions list
   ```

## Usage

### In QuoteEditor
The Send button is automatically added to the quote header when email is configured.

### Programmatically
```typescript
import { useSendQuoteEmail } from '@/services/email';

function MyComponent() {
  const sendEmail = useSendQuoteEmail();
  
  const handleSend = async () => {
    try {
      await sendEmail.mutateAsync({
        quoteId: 'quote-123',
        to: 'customer@example.com',
        subject: 'Your quote',
        body: 'Please find attached...'
      });
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };
  
  return (
    <button onClick={handleSend} disabled={sendEmail.isPending}>
      {sendEmail.isPending ? 'Sending...' : 'Send Quote'}
    </button>
  );
}
```

### Direct API Call
```typescript
import { sendQuoteEmail } from '@/services/email';

const result = await sendQuoteEmail({
  quoteId: 'quote-123',
  to: 'customer@example.com',
  cc: ['manager@company.com'],
  subject: 'Your quote Q-2024-001',
  body: 'Custom message...'
});
```

## Features

### ✅ Implemented
- [x] Edge Function with idempotency
- [x] Resend integration
- [x] Console fallback for development
- [x] Quote status update to 'sent'
- [x] Activity tracking
- [x] React hooks with error handling
- [x] Send dialog with pre-filled fields
- [x] Feature flag for email availability
- [x] Comprehensive testing

### 🔄 Future Enhancements
- [ ] SMTP provider implementation
- [ ] Email templates
- [ ] Attachment handling (currently links to PDF page)
- [ ] Email tracking
- [ ] Bulk sending
- [ ] Email history

## Testing

Run the email service tests:

```bash
npm test -- src/services/__tests__/email.test.ts
```

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify Supabase Edge Function is deployed
3. Check browser console for errors
4. Verify Resend API key is valid

### Idempotency Issues
- Each email send generates a unique `Idempotency-Key`
- Duplicate requests with same key return success without re-sending
- Check `public.idempotency_keys` table for conflicts

### PDF Links
- Currently links to `/pdf/quote/:id` route
- Ensure PDF generation endpoint exists
- Consider implementing actual PDF attachment

## Security Notes

- Edge Function uses service role key for database access
- Idempotency prevents duplicate sends
- Email addresses are validated on client and server
- CORS headers allow cross-origin requests (configure as needed)
