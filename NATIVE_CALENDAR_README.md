# Native Calendar Implementation

This document describes the implementation of a native calendar system for CRMFlow that works independently of Google Calendar while optionally supporting Google integration.

## Overview

The native calendar system provides:
- **First-party calendar functionality** without requiring Google Calendar
- **Optional Google Calendar integration** for users who want to sync
- **CRM entity linking** (deals, companies, quotes, orders)
- **Event categorization** (meeting, call, deadline, other)
- **User preferences** for Google layer visibility and sync defaults

## Database Schema

### Events Table

```sql
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  attendees jsonb DEFAULT '[]'::jsonb, -- [{email,name,optional}]
  color text, -- "primary|accent|warning|success|muted"
  kind text, -- "meeting|call|deadline|other"
  -- CRM-links (nullable)
  deal_id uuid REFERENCES public.deals(id),
  company_id uuid REFERENCES public.companies(id),
  quote_id uuid REFERENCES public.quotes(id),
  order_id uuid REFERENCES public.orders(id),
  -- Google sync fields (optional)
  google_event_id text,
  sync_state text DEFAULT 'none', -- 'none' | 'pending' | 'synced' | 'error'
  -- Ownership
  created_by uuid NOT NULL,
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### User Settings Table

```sql
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  calendar_show_google boolean DEFAULT false,
  calendar_default_sync boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Key Features

### 1. Native-First Approach
- Calendar works immediately without any external dependencies
- Users can create, view, and manage events without Google Calendar
- Full CRUD operations on native events

### 2. Google Layer Toggle
- When Google Calendar is connected, users can toggle Google layer visibility
- Events from both sources are merged and displayed together
- Clear visual distinction between native and Google events

### 3. CRM Integration
- Link events to deals, companies, quotes, and orders
- Navigate directly to CRM entities from event cards
- Filter events by CRM relationships

### 4. Event Types and Colors
- Categorize events: meeting, call, deadline, other
- Color coding: primary, accent, warning, success, muted
- Filter events by type

### 5. User Preferences
- Remember Google layer visibility preference
- Set default sync behavior for new events
- Settings persist across sessions

## Architecture

### Services

#### `src/services/events.ts`
- Native event CRUD operations
- Zod schema validation
- React Query hooks for data fetching
- User authentication checks

#### `src/services/settings.ts`
- User preferences management
- Calendar-specific settings
- Default settings creation

#### `src/lib/calendar-utils.ts`
- Event merging logic
- Source differentiation
- Filtering utilities
- Date range calculations

### Components

#### `src/pages/calendar/CalendarView.tsx`
- Main calendar view
- Google layer toggle
- Event list display
- Filter management

#### `src/components/calendar/CreateEventDialog.tsx`
- Event creation form
- Optional Google sync
- CRM entity linking
- Validation

#### `src/components/calendar/EventItem.tsx`
- Event display card
- Source badges (Native/Google)
- CRM entity links
- Attendee information

## Usage

### Creating Events

1. Click "Create Event" button
2. Fill in event details:
   - Title (required)
   - Description (optional)
   - Location (optional)
   - Start/End dates and times
   - All-day option
   - Attendees (comma-separated emails)
   - Event type and color
   - CRM entity links
3. Optionally check "Also create in Google" if connected
4. Submit form

### Managing Google Integration

1. **Connect Google Calendar:**
   - Go to Settings → Integrations → Google Calendar
   - Follow OAuth flow
   - Grant calendar permissions

2. **Toggle Google Layer:**
   - Use toggle button in calendar view
   - Shows/hides Google events
   - Preference is remembered

3. **Sync New Events:**
   - Check "Also create in Google" when creating events
   - Events are created in both systems
   - Sync status is tracked

### Filtering Events

- **By Type:** Click event type buttons (Meeting, Call, Deadline, Other)
- **By Date Range:** Use calendar navigation
- **By CRM Entity:** Filter by linked deals, companies, etc.
- **Clear Filters:** Use "Clear filters" button

## API Endpoints

### Events
- `GET /rest/v1/events` - List events with filters
- `POST /rest/v1/events` - Create event
- `PUT /rest/v1/events/:id` - Update event
- `DELETE /rest/v1/events/:id` - Delete event

### User Settings
- `GET /rest/v1/user_settings` - Get user preferences
- `PUT /rest/v1/user_settings` - Update preferences

## Testing

### Unit Tests
- `src/services/events.test.ts` - Event service tests
- `src/lib/calendar-utils.test.ts` - Utility function tests

### E2E Tests
- `tests/e2e/calendar-native.spec.ts` - Native calendar flow tests

Run tests:
```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

## Migration

To set up the native calendar:

1. **Run database migrations:**
   ```bash
   # Apply schema changes
   psql -d your_database -f database/schema.sql
   
   # Optional: Add demo events
   psql -d your_database -f database/seed.sql
   ```

2. **Deploy updated code:**
   ```bash
   npm run build
   npm run deploy
   ```

## Configuration

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Database Policies
Ensure RLS policies allow users to:
- Read/write their own events
- Read/write their own user settings
- Read CRM entities they have access to

## Future Enhancements

### Planned Features
1. **Two-way sync** - Sync changes between native and Google events
2. **Recurring events** - Support for recurring event patterns
3. **Event templates** - Predefined event templates
4. **Calendar views** - Month, week, day view options
5. **Event reminders** - Native notification system
6. **Calendar sharing** - Share calendars with team members

### Sync Improvements
1. **Conflict resolution** - Handle sync conflicts gracefully
2. **Batch operations** - Efficient bulk sync operations
3. **Sync history** - Track sync operations and errors
4. **Selective sync** - Choose which events to sync

## Troubleshooting

### Common Issues

1. **Events not appearing:**
   - Check user authentication
   - Verify date range filters
   - Check event ownership

2. **Google sync failing:**
   - Verify Google Calendar connection
   - Check OAuth token validity
   - Review sync error logs

3. **Performance issues:**
   - Check database indexes
   - Monitor query performance
   - Consider pagination for large event lists

### Debug Mode
Enable debug logging:
```typescript
// In development
localStorage.setItem('debug', 'calendar:*');
```

## Contributing

When contributing to the native calendar:

1. **Follow existing patterns** for services and components
2. **Add tests** for new functionality
3. **Update documentation** for API changes
4. **Consider backward compatibility** for existing events
5. **Test with and without Google integration**

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test cases for examples
3. Check database logs for errors
4. Verify environment configuration
