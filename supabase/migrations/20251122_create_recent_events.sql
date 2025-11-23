-- Migration: Create recent_events table for analytics live stream
-- Description: Stores recent analytics events for admin dashboard live view
-- Author: Analytics Backend Implementation
-- Date: 2025-11-22

-- Enable pgcrypto for UUID generation
create extension if not exists pgcrypto;

-- Create recent_events table
create table if not exists recent_events (
  id uuid default gen_random_uuid() primary key,
  event_name text not null,
  user_id_text text null,  -- Hashed or masked user identifier (SHA-256)
  properties jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Index for fast DESC queries (live tail)
create index if not exists idx_recent_events_created_at 
  on recent_events (created_at desc);

-- Index for event name filtering
create index if not exists idx_recent_events_event_name 
  on recent_events (event_name);

-- Retention policy: automatically delete events older than 7 days
-- (Optional: can be implemented via cron job or trigger)
comment on table recent_events is 
  'Stores recent analytics events for admin live stream. Retention: 7 days recommended.';

-- RLS Policies: Only accessible by service role and admins
alter table recent_events enable row level security;

-- Policy: Service role can insert (for mixpanel-proxy function)
create policy "Service role can insert recent_events"
  on recent_events for insert
  to service_role
  with check (true);

-- Policy: Admins can read (for admin-mixpanel-query function)
create policy "Admins can read recent_events"
  on recent_events for select
  to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
    )
  );

-- Optional: Function to auto-cleanup old events (can be called via pg_cron)
create or replace function cleanup_old_recent_events()
returns void
language plpgsql
security definer
as $$
begin
  delete from recent_events
  where created_at < now() - interval '7 days';
end;
$$;

comment on function cleanup_old_recent_events is 
  'Deletes events older than 7 days. Call via pg_cron or scheduled job.';

