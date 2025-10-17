# Deployment Steps for Incomplete Features Implementation

**Date:** October 17, 2025  
**Features:** Document Storage, Trash Bin, Email Templates, Two-Way Calendar Sync, Recurring Events

---

## Pre-Deployment Checklist

- [ ] All code changes committed to repository
- [ ] Database migrations reviewed
- [ ] Edge functions tested locally
- [ ] Environment variables documented
- [ ] Backup of production database created

---

## Step 1: Database Migrations

All migrations have been applied via MCP Supabase. Verify in production:

```sql
-- Check applied migrations
SELECT version, name, executed_at 
FROM supabase_migrations.schema_migrations 
WHERE version >= '20251017000001'
ORDER BY version;
```

**Expected Results:**
- ✅ `20251017000001_document_storage_schema_fix_v2`
- ✅ `20251017000002_email_templates`
- ✅ `20251017000003_two_way_calendar_sync`
- ✅ `recurring_events`

If any are missing, apply manually:

```bash
# From project root
psql $DATABASE_URL -f database/migrations/MIGRATION_FILE.sql
```

---

## Step 2: Create Supabase Storage Bucket

### Via Dashboard:

1. Go to **Supabase Dashboard** → **Storage** → **Buckets**
2. Click **New bucket**
3. Settings:
   - **Name:** `documents`
   - **Public:** No (Private)
   - **File size limit:** 50 MB
   - **Allowed MIME types:** (leave empty for all)
4. Click **Create bucket**

### Via CLI (Alternative):

```bash
# Create bucket
supabase storage create documents --public false

# Set size limit
supabase storage update documents --file-size-limit 52428800
```

### Configure Storage Policies:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated downloads
CREATE POLICY "Allow authenticated downloads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow users to delete own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND owner = auth.uid());
```

---

## Step 3: Deploy Edge Functions

### Deploy document-upload:

```bash
cd supabase/functions
supabase functions deploy document-upload --project-ref YOUR_PROJECT_REF
```

### Verify google-calendar-webhook is deployed:

```bash
supabase functions list

# If not deployed:
supabase functions deploy google-calendar-webhook --project-ref YOUR_PROJECT_REF
```

### Test Edge Functions:

```bash
# Test document-upload
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/document-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "test.pdf", "mimeType": "application/pdf"}'

# Should return: {"url": "...", "path": "...", "token": "..."}
```

---

## Step 4: Verify RLS Policies

```sql
-- Check all policies are in place
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('documents', 'email_templates', 'user_integrations')
ORDER BY tablename, policyname;
```

**Expected Policies:**

**documents:**
- ✅ Allow authenticated users to view documents
- ✅ Allow authenticated users to upload documents
- ✅ Allow users to update own documents
- ✅ Allow users to delete own documents

**email_templates:**
- ✅ Allow authenticated users to view templates
- ✅ Allow authenticated users to create templates
- ✅ Allow users to update templates
- ✅ Allow users to delete templates

---

## Step 5: Seed Default Email Templates

Check if default templates exist:

```sql
SELECT id, name, type, is_default 
FROM email_templates 
WHERE is_default = true;
```

If none exist, they were created automatically by migration. Verify:

```sql
SELECT COUNT(*) FROM email_templates;
-- Should return: 3 (quote, order, invoice templates)
```

---

## Step 6: Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to your hosting (Netlify, Vercel, etc.)
npm run deploy

# Or manually upload dist/ folder
```

---

## Step 7: Configure Google Calendar Webhook

### Add Webhook URL to Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs:**
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-calendar-webhook
   ```
6. Click **Save**

### Enable Domain Verification (if needed):

1. Go to **Google Calendar API** → **Domain Verification**
2. Add your Supabase function domain
3. Verify ownership via DNS or HTML file

---

## Step 8: User Testing

### Test Document Upload:

1. Log in to CRMFlow
2. Go to a Company → Documents tab
3. Click Upload
4. Select a file
5. Verify upload completes
6. Download the file
7. Verify file downloads correctly

### Test Trash Bin Restore:

1. Create a test quote
2. Delete the quote
3. Go to Settings → Trash Bin → Quotes
4. Find deleted quote
5. Click Restore
6. Verify quote is back in quotes list

### Test Two-Way Calendar Sync:

1. Connect Google Calendar (Settings → Integrations)
2. Enable Two-Way Sync toggle
3. Create event in CRMFlow → verify in Google Calendar
4. Create event in Google Calendar → wait 30 seconds → verify in CRMFlow
5. Update event in Google Calendar → verify updated in CRMFlow

### Test Recurring Events:

Currently awaiting UI implementation. Test via API:

```typescript
// Create recurring event via console
await supabase.from('events').insert({
  title: 'Weekly Team Meeting',
  start_at: '2025-10-20T10:00:00Z',
  end_at: '2025-10-20T11:00:00Z',
  recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;COUNT=10',
  created_by: userId,
});
```

---

## Step 9: Monitor & Verify

### Check Edge Function Logs:

```bash
# Document upload logs
supabase functions logs document-upload --tail

# Calendar webhook logs
supabase functions logs google-calendar-webhook --tail
```

### Check for Errors:

```sql
-- Check for failed document uploads
SELECT * FROM documents 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check calendar sync activity
SELECT * FROM user_integrations 
WHERE kind = 'calendar' 
AND resource_id IS NOT NULL;
```

### Performance Check:

```sql
-- Check document table size
SELECT pg_size_pretty(pg_total_relation_size('documents'));

-- Check email templates count
SELECT type, COUNT(*) FROM email_templates GROUP BY type;
```

---

## Step 10: Post-Deployment Tasks

### Update User Documentation:

- [ ] Add guide for uploading documents
- [ ] Add guide for restoring deleted items
- [ ] Add guide for enabling two-way calendar sync
- [ ] Update FAQ with new features

### Team Training:

- [ ] Demo document upload feature
- [ ] Show trash bin restore functionality
- [ ] Explain two-way calendar sync benefits
- [ ] Share email template customization guide

### Monitoring:

- [ ] Set up alerts for Edge Function errors
- [ ] Monitor Storage bucket usage
- [ ] Track webhook subscription renewals
- [ ] Review user feedback

---

## Rollback Plan

If issues arise:

### Rollback Edge Functions:

```bash
# Revert to previous version
supabase functions deploy document-upload --project-ref YOUR_REF --version PREVIOUS_VERSION
```

### Rollback Database:

```sql
-- Disable new features
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
DROP TABLE email_templates CASCADE;

-- Remove recurrence fields
ALTER TABLE events 
  DROP COLUMN recurrence_rule,
  DROP COLUMN recurrence_end_date,
  DROP COLUMN parent_event_id,
  DROP COLUMN exception_dates;
```

### Rollback Frontend:

```bash
git revert HEAD
npm run build
npm run deploy
```

---

## Troubleshooting

### Document Upload Fails

**Error:** "Storage bucket not configured"
**Fix:** Create `documents` bucket in Supabase Storage

**Error:** "Failed to get upload URL"
**Fix:** Check Edge Function is deployed: `supabase functions list`

### Trash Bin Empty

**Error:** Deleted items not showing
**Fix:** Verify soft-delete is working:
```sql
SELECT * FROM quotes WHERE deleted_at IS NOT NULL LIMIT 10;
```

### Calendar Sync Not Working

**Error:** Toggle doesn't enable
**Fix:** Check Google Calendar is connected first

**Error:** Events not syncing from Google
**Fix:** 
1. Verify webhook is deployed
2. Check webhook logs: `supabase functions logs google-calendar-webhook`
3. Verify webhook URL in Google Cloud Console

---

## Success Criteria

Deployment is successful when:

- ✅ Users can upload documents and see them in UI
- ✅ Documents can be downloaded successfully
- ✅ Deleted quotes can be restored from trash
- ✅ Deleted orders can be restored from trash
- ✅ Email templates exist in database
- ✅ Two-way calendar sync toggle appears in Settings
- ✅ Events sync from Google Calendar to CRMFlow
- ✅ No console errors in browser
- ✅ No errors in Edge Function logs

---

## Support Contacts

- **Technical Issues:** Check Edge Function logs
- **Database Issues:** Review migration logs
- **User Issues:** Check browser console + network tab

---

**Deployment Guide prepared by:** Sovereign Architect  
**Date:** October 17, 2025  
**Version:** CRMFlow 1.1 - Incomplete Features Complete

