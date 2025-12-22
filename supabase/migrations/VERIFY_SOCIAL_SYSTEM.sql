-- ============================================
-- VERIFICATION SCRIPT FOR SOCIAL SYSTEM
-- Run this AFTER executing EXECUTE_SOCIAL_MIGRATION.sql
-- ============================================

-- 1. Verify tables exist
SELECT 
  'Tables Check' as check_type,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  SELECT unnest(ARRAY['follows', 'friends', 'conversations', 'messages']) as table_name
) t
LEFT JOIN information_schema.tables it 
  ON it.table_schema = 'public' AND it.table_name = t.table_name
ORDER BY table_name;

-- 2. Verify profiles columns
SELECT 
  'Profiles Columns Check' as check_type,
  column_name,
  CASE WHEN column_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  SELECT unnest(ARRAY[
    'username', 
    'bio', 
    'following_count', 
    'followers_count', 
    'friends_count', 
    'is_online', 
    'last_seen_at', 
    'voice_status'
  ]) as column_name
) t
LEFT JOIN information_schema.columns ic
  ON ic.table_schema = 'public' 
  AND ic.table_name = 'profiles' 
  AND ic.column_name = t.column_name
ORDER BY column_name;

-- 3. Verify RLS is enabled
SELECT 
  'RLS Check' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('follows', 'friends', 'conversations', 'messages')
ORDER BY tablename;

-- 4. Verify indexes exist
SELECT 
  'Indexes Check' as check_type,
  indexname,
  tablename,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_%messages%' OR
    indexname LIKE 'idx_%conversations%' OR
    indexname LIKE 'idx_%follows%' OR
    indexname LIKE 'idx_%friends%'
  )
ORDER BY tablename, indexname;

-- 5. Verify policies exist
SELECT 
  'RLS Policies Check' as check_type,
  schemaname,
  tablename,
  policyname,
  '✅ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('follows', 'friends', 'conversations', 'messages')
ORDER BY tablename, policyname;

-- 6. Verify function exists
SELECT 
  'Function Check' as check_type,
  routine_name,
  CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_updated_at';

-- 7. Verify trigger exists
SELECT 
  'Trigger Check' as check_type,
  trigger_name,
  event_object_table,
  CASE WHEN trigger_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'set_friends_updated_at';

