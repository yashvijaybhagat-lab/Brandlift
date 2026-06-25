-- ============================================================
-- BrandLift Platform — Initial Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────
create type user_plan     as enum ('free', 'starter', 'pro');
create type store_theme   as enum ('minimal', 'bold', 'luxury', 'tech');
create type order_status  as enum ('pending', 'paid', 'fulfilled', 'cancelled');

-- ── users ────────────────────────────────────────────────────
create table if not exists users (
  id                uuid primary key default uuid_generate_v4(),
  email             text not null unique,
  name              text,
  avatar_url        text,
  plan              user_plan not null default 'free',
  stripe_customer_id text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index users_email_idx on users (email);

-- ── subscribers ───────────────────────────────────────────────
create table if not exists subscribers (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null unique,
  subscribed_at timestamptz not null default now()
);

-- ── stores ───────────────────────────────────────────────────
create table if not exists stores (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users (id) on delete cascade,
  name          text not null,
  slug          text not null unique,
  description   text,
  logo_url      text,
  banner_url    text,
  theme         store_theme not null default 'minimal',
  theme_config  jsonb not null default '{}',
  custom_domain text unique,
  is_published  boolean not null default true,
  page_sections jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index stores_user_id_idx   on stores (user_id);
create index stores_slug_idx      on stores (slug);
create index stores_published_idx on stores (is_published) where is_published = true;

-- ── products ─────────────────────────────────────────────────
create table if not exists products (
  id               uuid primary key default uuid_generate_v4(),
  store_id         uuid not null references stores (id) on delete cascade,
  name             text not null,
  slug             text not null,
  description      text,
  price            numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price >= 0),
  images           text[] not null default '{}',
  inventory        integer check (inventory >= 0),
  is_available     boolean not null default true,
  variants         jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (store_id, slug)
);

create index products_store_id_idx    on products (store_id);
create index products_available_idx   on products (store_id, is_available) where is_available = true;

-- ── orders ───────────────────────────────────────────────────
create table if not exists orders (
  id                    uuid primary key default uuid_generate_v4(),
  store_id              uuid not null references stores (id) on delete cascade,
  customer_email        text not null,
  customer_name         text not null,
  items                 jsonb not null default '[]',
  subtotal              numeric(10, 2) not null check (subtotal >= 0),
  total                 numeric(10, 2) not null check (total >= 0),
  status                order_status not null default 'pending',
  shipping_address      jsonb,
  stripe_payment_intent text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index orders_store_id_idx on orders (store_id);
create index orders_status_idx   on orders (store_id, status);
create index orders_email_idx    on orders (customer_email);

-- ── updated_at triggers ───────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at    before update on users    for each row execute function set_updated_at();
create trigger stores_updated_at   before update on stores   for each row execute function set_updated_at();
create trigger products_updated_at before update on products for each row execute function set_updated_at();
create trigger orders_updated_at   before update on orders   for each row execute function set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table users        enable row level security;
alter table stores       enable row level security;
alter table products     enable row level security;
alter table orders       enable row level security;
alter table subscribers  enable row level security;

-- users: each row is owned by the matching email (next-auth doesn't use Supabase auth,
-- so we use a service-role key on the server and anon for public reads only)
create policy "users: server-side only"
  on users for all using (false);   -- all access via service role key on server

-- stores: public can read published stores; owners manage via server
create policy "stores: public read published"
  on stores for select using (is_published = true);

create policy "stores: server write"
  on stores for all using (false);  -- writes via service role on server

-- products: public can read available products of published stores
create policy "products: public read available"
  on products for select using (
    is_available = true
    and exists (
      select 1 from stores s
      where s.id = products.store_id
      and s.is_published = true
    )
  );

create policy "products: server write"
  on products for all using (false);

-- orders: no public access — server only
create policy "orders: server only"
  on orders for all using (false);

-- subscribers: insert only (email signups)
create policy "subscribers: insert only"
  on subscribers for insert with check (true);

-- ── Service role bypass note ─────────────────────────────────
-- All API routes use the anon key but mutations need the service role key.
-- Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars and use it for writes.
-- For now, the anon key works for public reads (stores/products SELECT).
