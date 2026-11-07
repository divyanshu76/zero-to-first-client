-- Migration 003: Checkout Recovery (opt-in reminders). See docs/CHECKOUT_RECOVERY.md.
--
-- Run ONCE in the Supabase SQL editor, after 001 (and 002 where it applied). Do not rerun 001/002.
-- Additive and idempotent: it never drops, truncates, deletes or rewrites existing rows.
--   * orders: four new NULLABLE columns. Existing orders get NULL consent = never contacted.
--   * five new tables, RLS on with NO policies, no privileges for anon/authenticated.
--   * automation starts OFF.
-- The scheduler (pg_cron + pg_net) is NOT set up here: see 004_recovery_cron.sql.

do $$
begin
  if to_regclass('public.orders') is null then
    raise exception 'public.orders does not exist: run 001_commerce.sql first.';
  end if;
end $$;

-- 1. Consent and recovery attribution on orders (all nullable; no existing row changes).
alter table public.orders
  add column if not exists reminder_email_consent_at    timestamptz,
  add column if not exists reminder_whatsapp_consent_at timestamptz,
  add column if not exists consent_version              text,
  add column if not exists recovered_from_order_id      text;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_consent_version_len') then
    alter table public.orders add constraint orders_consent_version_len check (consent_version is null or char_length(consent_version) <= 40) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_recovered_from_fk') then
    alter table public.orders add constraint orders_recovered_from_fk foreign key (recovered_from_order_id) references public.orders (id) on delete set null not valid;
  end if;
end $$;

create index if not exists orders_recovery_idx on public.orders (created_at desc) where reminder_email_consent_at is not null or reminder_whatsapp_consent_at is not null;

-- The view lists columns fixed at creation time; re-create it so it includes the new ones (appended).
create or replace view public.orders_with_delivery with (security_invoker = true) as select * from public.orders;

-- 2. Every reminder (email) and every manual WhatsApp chat opened by the admin.
create table if not exists public.recovery_messages (
  id                  bigint generated always as identity primary key,
  order_id            text not null references public.orders (id) on delete cascade,
  channel             text not null check (channel in ('email', 'whatsapp')),
  stage               text not null check (stage in ('auto_1', 'auto_2', 'manual')),
  status              text not null default 'sending' check (status in ('sending', 'sent', 'failed', 'opened')),
  idempotency_key     text not null unique check (char_length(idempotency_key) <= 120),
  triggered_by        text not null check (triggered_by in ('scheduler', 'admin')),
  attempts            integer not null default 1 check (attempts between 1 and 10),
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 100),
  error               text check (error is null or char_length(error) <= 300),
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);
-- An automatic reminder can exist at most once per order and stage, whoever tries to send it.
create unique index if not exists recovery_messages_auto_once on public.recovery_messages (order_id, stage) where channel = 'email' and stage in ('auto_1', 'auto_2');
create index if not exists recovery_messages_order_idx on public.recovery_messages (order_id);
create index if not exists recovery_messages_created_idx on public.recovery_messages (created_at desc);

-- 3. Automation settings: exactly one row. Automation is OFF until the owner turns it on.
create table if not exists public.recovery_settings (
  id                 smallint primary key default 1 check (id = 1),
  automation_enabled boolean not null default false,
  paused_until       timestamptz,
  daily_cap          integer not null default 30 check (daily_cap between 0 and 500),
  run_lock_until     timestamptz,
  bulk_lock_until    timestamptz,
  updated_at         timestamptz not null default now()
);
insert into public.recovery_settings (id) values (1) on conflict (id) do nothing;

-- 4. Scheduler / admin run log. The nonce makes each signed scheduler call single-use.
create table if not exists public.recovery_runs (
  id          bigint generated always as identity primary key,
  trigger     text not null check (trigger in ('cron', 'admin')),
  nonce       text unique check (nonce is null or char_length(nonce) <= 64),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running', 'ok', 'skipped', 'error')),
  examined    integer not null default 0,
  sent        integer not null default 0,
  skipped     integer not null default 0,
  failed      integer not null default 0,
  recovered   integer not null default 0,
  note        text check (note is null or char_length(note) <= 300)
);
create index if not exists recovery_runs_started_idx on public.recovery_runs (started_at desc);

-- 5. Unsubscribed addresses, stored as SHA-256 of the lower-cased email (never the address).
create table if not exists public.email_suppressions (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  reason     text not null check (reason in ('unsubscribe', 'admin')),
  created_at timestamptz not null default now()
);

-- 6. "Continue checkout" and unsubscribe links. Only the SHA-256 of each token is stored.
create table if not exists public.recovery_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  order_id   text not null references public.orders (id) on delete cascade,
  purpose    text not null check (purpose in ('resume', 'unsubscribe')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists recovery_tokens_order_idx on public.recovery_tokens (order_id);

-- 7. Server-only access (service role). RLS on with no policies; no privileges for public roles.
alter table public.recovery_messages  enable row level security;
alter table public.recovery_settings  enable row level security;
alter table public.recovery_runs      enable row level security;
alter table public.email_suppressions enable row level security;
alter table public.recovery_tokens    enable row level security;
revoke all on table public.recovery_messages, public.recovery_settings, public.recovery_runs, public.email_suppressions, public.recovery_tokens from anon, authenticated;
