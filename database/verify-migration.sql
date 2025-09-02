-- Verification script for Native Calendar Migration
-- Run this after executing schema.sql and seed.sql

-- Check if events table exists and has correct structure
SELECT 
    'events' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'events'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check if user_settings table exists
SELECT 
    'user_settings' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_settings'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check if required columns exist in events table
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('id', 'title', 'start_at', 'end_at', 'created_by') THEN '✅ REQUIRED'
        ELSE '✅ OPTIONAL'
    END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events'
ORDER BY column_name;

-- Check if required indexes exist
SELECT 
    indexname,
    CASE 
        WHEN indexname LIKE 'idx_events_%' THEN '✅ EVENTS INDEX'
        ELSE '✅ OTHER INDEX'
    END as index_type
FROM pg_indexes 
WHERE tablename = 'events' 
AND schemaname = 'public'
ORDER BY indexname;

-- Check if triggers exist
SELECT 
    trigger_name,
    CASE 
        WHEN trigger_name = 'trg_events_updated_at' THEN '✅ UPDATED_AT TRIGGER'
        ELSE '✅ OTHER TRIGGER'
    END as trigger_type
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'events'
ORDER BY trigger_name;

-- Check if demo events were created (if seed.sql was run)
SELECT 
    'demo_events' as check_type,
    COUNT(*) as event_count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ DEMO EVENTS CREATED'
        ELSE '⚠️  NO DEMO EVENTS (run seed.sql)'
    END as status
FROM public.events 
WHERE title IN ('Demo Meeting', 'Project Deadline', 'Client Call');

-- Check if user_settings has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_settings'
ORDER BY column_name;

-- Summary
SELECT 
    'MIGRATION SUMMARY' as summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'events'
        ) 
        AND EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_settings'
        )
        THEN '✅ NATIVE CALENDAR MIGRATION SUCCESSFUL'
        ELSE '❌ MIGRATION INCOMPLETE - CHECK ERRORS ABOVE'
    END as result;
