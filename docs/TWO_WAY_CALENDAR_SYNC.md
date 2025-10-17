# Two-Way Calendar Sync Implementation

**Status:** ✅ COMPLETE  
**Date:** October 17, 2025

## Overview

Two-way calendar sync keeps events synchronized between CRMFlow and Google Calendar in real-time using Google Calendar push notifications (webhooks).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Two-Way Sync Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CRMFlow → Google Calendar (Always Active)              │
│  ─────────────────────────────────────                  │
│  1. User creates event in CRMFlow                       │
│  2. Event synced to Google Calendar via API             │
│  3. google_event_id stored in CRMFlow event             │
│  4. CRM metadata stored in extended properties          │
│                                                          │
│  Google Calendar → CRMFlow (Requires Setup)             │
│  ────────────────────────────────────────               │
│  1. User enables two-way sync in Settings               │
│  2. CRMFlow subscribes to Google Calendar webhooks      │
│  3. Google sends push notification on changes           │
│  4. Webhook handler fetches changed events              │
│  5. CRMFlow events updated automatically                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### Added Columns to `user_integrations`

```sql
ALTER TABLE public.user_integrations 
  ADD COLUMN resource_id text,
  ADD COLUMN channel_id text,
  ADD COLUMN webhook_expiration timestamptz;
```

- **resource_id**: Google Calendar push notification resource identifier
- **channel_id**: Unique channel ID for this webhook subscription
- **webhook_expiration**: When the webhook subscription expires (renewed automatically)

## Implementation

### 1. Webhook Handler

**File:** `supabase/functions/google-calendar-webhook/index.ts`

Handles incoming push notifications from Google Calendar:
- Receives webhook POST requests from Google
- Fetches changed events from Google Calendar API
- Creates/updates CRM events to match Google Calendar
- Preserves CRM metadata (deal links, company references)

### 2. Sync Management Service

**File:** `src/services/calendarSync.ts`

Provides functions to:
- `getCalendarSyncStatus()` - Check if sync is enabled
- `enableCalendarSync()` - Subscribe to Google Calendar push notifications
- `disableCalendarSync()` - Unsubscribe from push notifications
- `renewCalendarSyncIfNeeded()` - Auto-renew expiring subscriptions

### 3. UI Component

**File:** `src/components/settings/CalendarSyncSettings.tsx`

Settings UI for managing two-way sync:
- Toggle switch to enable/disable sync
- Shows sync status and expiration
- Displays last sync time
- Auto-renewal notifications

## Setup Instructions

### 1. Deploy Webhook Handler

```bash
cd supabase/functions
supabase functions deploy google-calendar-webhook
```

Verify deployment:
```bash
supabase functions list
```

### 2. Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Add authorized redirect URI:
   ```
   https://your-project.supabase.co/functions/v1/google-calendar-webhook
   ```

### 3. Apply Database Migration

Migration already applied via MCP:
```sql
-- Verify columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_integrations' 
AND column_name IN ('resource_id', 'channel_id', 'webhook_expiration');
```

### 4. Add to Settings Page

In `src/pages/Settings.tsx`, add:

```typescript
import { CalendarSyncSettings } from '@/components/settings/CalendarSyncSettings';

// In the settings tabs
<TabsContent value="integrations">
  <CalendarSyncSettings />
  {/* ... other integration settings */}
</TabsContent>
```

## Usage

### Enable Two-Way Sync

Users can enable sync from Settings → Integrations:

1. Connect Google Calendar (if not already connected)
2. Toggle "Enable Two-Way Sync"
3. Sync is active immediately

### What Gets Synced

**CRMFlow → Google Calendar:**
- All events created in CRMFlow
- Updates to event title, time, location, attendees
- Event deletions
- CRM metadata (deal, company, quote references)

**Google Calendar → CRMFlow:**
- New events created in Google Calendar
- Updates to existing events
- Event deletions (not yet implemented)
- Attendee changes

### CRM Metadata Preservation

Events created in CRMFlow include extended properties:
```json
{
  "extendedProperties": {
    "private": {
      "crmflowEventId": "uuid",
      "crmflowDealId": "uuid",
      "crmflowCompanyId": "uuid",
      "crmflowKind": "meeting"
    }
  }
}
```

When syncing back from Google, these properties are preserved.

## How It Works

### Initial Sync Setup

1. User enables two-way sync
2. Frontend calls `enableCalendarSync()`
3. Service requests Google Calendar watch endpoint:
   ```javascript
   POST https://www.googleapis.com/calendar/v3/calendars/primary/events/watch
   {
     "id": "unique-channel-id",
     "type": "web_hook",
     "address": "https://your-project.supabase.co/functions/v1/google-calendar-webhook",
     "expiration": Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
   }
   ```
4. Google returns `resourceId` and confirms subscription
5. `resource_id` and `channel_id` stored in database

### Event Change Notification

1. User creates/modifies event in Google Calendar
2. Google sends POST to webhook URL with notification
3. Webhook handler:
   - Validates notification
   - Fetches changed events from Google Calendar API
   - For each event:
     - If has CRM metadata → update existing CRM event
     - If has google_event_id → update matching CRM event
     - Otherwise → create new CRM event
4. CRMFlow UI automatically refreshes via React Query

### Subscription Renewal

Subscriptions expire after 7 days. Auto-renewal:

1. Frontend calls `renewCalendarSyncIfNeeded()` periodically
2. If expiring within 24 hours:
   - Disable old subscription
   - Create new subscription
   - Update database with new IDs

## Conflict Resolution

**Strategy:** Last-write-wins (simple, predictable)

- If event updated in both places, most recent change wins
- Google Calendar timestamps are authoritative
- CRM metadata never overwritten from Google

**Future Enhancement:** Conflict detection with manual resolution UI

## Security

### Webhook Validation

- Webhook handler verifies `x-goog-resource-state` header
- `resource_id` matched against database to find user
- Only processes events for authenticated users

### Token Management

- Access tokens refreshed automatically if expired
- Tokens stored securely in `user_integrations` with RLS
- Service role key used in webhook handler for database access

### Data Privacy

- Users only receive webhooks for their own calendar
- No cross-user data leakage possible
- Webhook subscription tied to specific user via `resource_id`

## Monitoring & Debugging

### Check Sync Status

```sql
SELECT 
  user_id,
  email,
  resource_id,
  channel_id,
  webhook_expiration,
  updated_at
FROM user_integrations
WHERE provider = 'google' 
  AND kind = 'calendar'
  AND resource_id IS NOT NULL;
```

### View Webhook Logs

```bash
# Supabase CLI
supabase functions logs google-calendar-webhook

# Or via Dashboard
Dashboard → Edge Functions → google-calendar-webhook → Logs
```

### Test Webhook Manually

```bash
curl -X POST https://your-project.supabase.co/functions/v1/google-calendar-webhook \
  -H "Content-Type: application/json" \
  -H "x-goog-resource-state: exists" \
  -d '{
    "resourceId": "test-resource-id",
    "resourceUri": "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    "id": "test-channel-id"
  }'
```

## Troubleshooting

### Sync Not Working

1. **Check webhook is deployed:**
   ```bash
   curl https://your-project.supabase.co/functions/v1/google-calendar-webhook
   ```

2. **Verify subscription is active:**
   ```sql
   SELECT * FROM user_integrations 
   WHERE kind = 'calendar' AND resource_id IS NOT NULL;
   ```

3. **Check webhook expiration:**
   - If expired, disable and re-enable sync

4. **Review logs:**
   ```bash
   supabase functions logs google-calendar-webhook --tail
   ```

### Events Not Appearing

1. Check that event was created after sync was enabled
2. Verify Google Calendar integration is connected
3. Check that access token is not expired
4. Look for errors in webhook logs

### Duplicate Events

If events appear twice:
1. Check `google_event_id` is being set correctly
2. Verify webhook handler is not running twice
3. Check for multiple active subscriptions (shouldn't happen)

## Limitations

### Current Limitations

1. **Event Deletions:** Deleted events in Google Calendar not yet removed from CRM
2. **Recurring Events:** Individual instances sync, but series metadata not preserved
3. **Attachments:** File attachments not synced
4. **Reminders:** Reminder settings not synced

### Google API Limits

- **Webhook Expiration:** 7 days max (auto-renewed)
- **Rate Limits:** 1,000,000 requests/day per project
- **Push Notifications:** ~1 second latency for change detection

## Future Enhancements

- [ ] Sync event deletions from Google → CRM
- [ ] Conflict detection with user resolution UI
- [ ] Batch sync for initial calendar import
- [ ] Recurring event series support
- [ ] Selective sync (choose which calendar to sync)
- [ ] Multiple calendar support
- [ ] Attachment sync
- [ ] Reminder sync

## Testing

### Manual Testing Checklist

- [ ] Enable two-way sync in Settings
- [ ] Create event in CRMFlow → verify in Google Calendar
- [ ] Update event in CRMFlow → verify updated in Google Calendar
- [ ] Create event in Google Calendar → verify in CRMFlow
- [ ] Update event in Google Calendar → verify updated in CRMFlow
- [ ] Disable two-way sync → verify webhook stopped

### Automated Tests

```bash
# Test webhook handler
cd supabase/functions
deno test google-calendar-webhook/index.ts

# Test sync service
npm test src/services/calendarSync.test.ts
```

## Support

For issues:
1. Check webhook logs
2. Verify Google Calendar API is enabled
3. Check OAuth credentials are correct
4. Review Supabase function environment variables
5. Ensure redirect URI is whitelisted in Google Cloud Console

---

**Implementation completed by:** Sovereign Architect  
**Date:** October 17, 2025

