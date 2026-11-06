-- CRAFT & CODE commerce schema (Supabase / Postgres).
-- Run once in the Supabase SQL editor (or `supabase db push`). The app talks to these tables
-- only with the service-role key, on the server. Row Level Security is enabled with NO
-- policies, so the public anon key can read or write nothing.

create table if not exists public.orders (
  id                  text primary key,                       -- internal id, ord_…
  product_id          text not null,
  customer_name       text not null check (char_length(customer_name) between 1 and 100),
  customer_email      text not null check (char_length(customer_email) between 3 and 254),
  customer_phone      text check (customer_phone ~ '^\+91[6-9][0-9]{9}$'),
  locale              text not null default 'en' check (locale in ('en', 'hi')),
  amount              integer not null check (amount > 0),    -- paise
  currency            text not null check (currency = 'INR'),
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  payment_status      text not null default 'pending'
                      check (payment_status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  paid_at             timestamptz,
  -- delivery
  email_status        text not null default 'pending' check (email_status in ('pending', 'sending', 'sent', 'failed')),
  delivery_attempts   integer not null default 0,
  email_claimed_at    timestamptz,
  email_sent_at       timestamptz,
  last_email_error    text,
  owner_email_status  text not null default 'pending' check (owner_email_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  owner_delivery_attempts integer not null default 0,
  owner_email_claimed_at timestamptz,
  owner_email_sent_at timestamptz,
  last_owner_email_error text,
  download_count      integer not null default 0,
  downloads_today     integer not null default 0,
  download_day        date,
  last_download_at    timestamptz
);

create index if not exists orders_email_idx   on public.orders (lower(customer_email));
create index if not exists orders_status_idx  on public.orders (payment_status, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.webhook_events (
  event_id    text primary key,                               -- x-razorpay-event-id (unique → idempotent)
  event_type  text not null,
  received_at timestamptz not null default now()
);

create table if not exists public.access_tokens (
  token_hash  text primary key,                               -- sha256 of the token; the token itself is never stored
  order_id    text not null references public.orders (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists access_tokens_order_idx on public.access_tokens (order_id);

alter table public.orders         enable row level security;
alter table public.webhook_events enable row level security;
alter table public.access_tokens  enable row level security;

create or replace view public.orders_with_delivery with (security_invoker = true) as select * from public.orders;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

create or replace function public.create_order(p_id text, p_product_id text, p_name text, p_email text, p_phone text, p_locale text, p_amount integer, p_currency text, p_razorpay_order_id text)
returns void language sql security definer set search_path = public as $$
  insert into orders (id, product_id, customer_name, customer_email, customer_phone, locale, amount, currency, razorpay_order_id)
  values (p_id, p_product_id, p_name, lower(p_email), p_phone, p_locale, p_amount, p_currency, p_razorpay_order_id);
$$;

-- Atomic transition to paid. Returns true for exactly one caller (verify or webhook).
create or replace function public.mark_order_paid(p_razorpay_order_id text, p_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update orders set payment_status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
   where razorpay_order_id = p_razorpay_order_id
     and payment_status in ('pending', 'processing', 'failed', 'cancelled');
  get diagnostics n = row_count;
  return n = 1;
exception when unique_violation then
  return false;  -- this payment id is already attached to another order
end $$;

-- Claims the delivery email. A 'sending' claim older than 5 minutes (crashed worker) can be re-claimed.
create or replace function public.claim_email_delivery(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update orders set email_status = 'sending', delivery_attempts = delivery_attempts + 1, email_claimed_at = now()
   where id = p_order_id and payment_status = 'paid' and delivery_attempts < 5
     and (email_status in ('pending', 'failed') or (email_status = 'sending' and email_claimed_at < now() - interval '5 minutes'));
  get diagnostics n = row_count;
  return n = 1;
end $$;

create or replace function public.record_email_result(p_order_id text, p_ok boolean, p_error text)
returns void language sql security definer set search_path = public as $$
  update orders set email_status = case when p_ok then 'sent' else 'failed' end,
                    email_sent_at = case when p_ok then now() else email_sent_at end,
                    last_email_error = case when p_ok then null else left(p_error, 300) end
   where id = p_order_id;
$$;

-- Claims the owner notification email atomically.
create or replace function public.claim_owner_email_delivery(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update orders set owner_email_status = 'sending', owner_delivery_attempts = owner_delivery_attempts + 1, owner_email_claimed_at = now()
   where id = p_order_id and payment_status = 'paid' and owner_delivery_attempts < 5
     and (owner_email_status in ('pending', 'failed') or (owner_email_status = 'sending' and owner_email_claimed_at < now() - interval '5 minutes'));
  get diagnostics n = row_count;
  return n = 1;
end $$;

create or replace function public.record_owner_email_result(p_order_id text, p_ok boolean, p_error text)
returns void language sql security definer set search_path = public as $$
  update orders set owner_email_status = case when p_ok then 'sent' else 'failed' end,
                    owner_email_sent_at = case when p_ok then now() else owner_email_sent_at end,
                    last_owner_email_error = case when p_ok then null else left(p_error, 300) end
   where id = p_order_id;
$$;

-- Per-order daily download limit, enforced atomically.
create or replace function public.record_download(p_order_id text, p_day date, p_max integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update orders set
      downloads_today = case when download_day is distinct from p_day then 1 else downloads_today + 1 end,
      download_day = p_day, download_count = download_count + 1, last_download_at = now()
   where id = p_order_id and payment_status = 'paid'
     and (download_day is distinct from p_day or downloads_today < p_max);
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Only the server (service role) may call these. Explicit argument lists keep this unambiguous.
revoke all on function
  public.create_order(text, text, text, text, text, text, integer, text, text),
  public.mark_order_paid(text, text),
  public.claim_email_delivery(text),
  public.record_email_result(text, boolean, text),
  public.claim_owner_email_delivery(text),
  public.record_owner_email_result(text, boolean, text),
  public.record_download(text, date, integer)
from public, anon, authenticated;

-- Storage: create a PRIVATE bucket named "ebooks" (Storage → New bucket → Public OFF) and upload
-- the PDF there with scripts/upload-ebook.mjs. Never make the bucket public.
