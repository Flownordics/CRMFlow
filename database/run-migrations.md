# Running Native Calendar Migrations

## Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/vziwouylxsfbummcvckx
   - Navigate to the SQL Editor

2. **Run the Schema Migration:**
   - Copy the entire contents of `database/schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

3. **Run the Seed Data (Optional):**
   - Copy the entire contents of `database/seed.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

## Option 2: Install Supabase CLI

If you prefer to use the CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref vziwouylxsfbummcvckx

# Run migrations
supabase db push
```

## Option 3: Direct Database Connection

If you have PostgreSQL client installed:

```bash
# Get your database connection string from Supabase dashboard
# Settings > Database > Connection string

# Run schema
psql "your-connection-string" -f database/schema.sql

# Run seed data
psql "your-connection-string" -f database/seed.sql
```

## Verification

After running the migrations, verify the tables were created:

```sql
-- Check if events table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'events';

-- Check if user_settings table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_settings';

-- Check table structure
\d public.events
\d public.user_settings
```

## Expected Results

After successful migration, you should see:

1. **New Tables Created:**
   - `public.events` - Native calendar events
   - `public.user_settings` - User preferences

2. **Indexes Created:**
   - `idx_events_timerange`
   - `idx_events_created_by`
   - `idx_events_deal_company`
   - `idx_events_google_event_id`

3. **Triggers Created:**
   - `trg_events_updated_at`
   - `trg_user_settings_updated_at`

4. **Demo Events (if seed was run):**
   - Demo Meeting
   - Project Deadline
   - Client Call

## Troubleshooting

If you encounter errors:

1. **Check for existing tables:** The schema uses `CREATE TABLE IF NOT EXISTS`
2. **Verify permissions:** Ensure you have admin access to the database
3. **Check extensions:** The schema requires `pgcrypto` and `uuid-ossp` extensions
4. **Review error messages:** Supabase dashboard will show detailed error information

## Next Steps

After successful migration:

1. **Test the API:** Try creating an event through your application
2. **Verify RLS Policies:** Ensure Row Level Security is properly configured
3. **Test Google Integration:** If you have Google Calendar connected, test the toggle functionality
