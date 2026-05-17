-- Run this once in your Supabase SQL editor
create table if not exists public.subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  subscribed_at timestamptz not null default now()
);

-- Allow the anon key to insert (footer form uses the anon key via the API route)
alter table public.subscribers enable row level security;

create policy "anyone can subscribe"
  on public.subscribers for insert
  with check (true);

-- Only the service role can read the list (used by the export script)
create policy "service role can read subscribers"
  on public.subscribers for select
  using (auth.role() = 'service_role');
