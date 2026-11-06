-- Migration 002: bring a database created by an EARLIER version of 001_commerce.sql up to date.
--
-- Run this ONLY if 001 was applied before (orders table exists). Do NOT run it on an empty
-- database: run the current 001_commerce.sql instead, which already contains everything below.
--
-- Additive and idempotent: it never drops, truncates, deletes or rewrites rows. Safe to re-run.
-- Adds: customer mobile number (+ the 9-argument create_order the app now calls) and
-- owner-notification tracking (columns + atomic claim/record functions).

-- 0. Guard: stop if 001 has never been applied.
do $$
begin
  if to_regclass('public.orders') is null then
    raise exception 'public.orders does not exist: run 001_commerce.sql first (not 002).';
  end if;
end $$;

-- 1. Customer mobile number (older 001 versions had no such column).
alter table public.orders add column if not exists customer_phone text;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_customer_phone_check') then
    -- NOT VALID: checks new/updated rows only, never rejects existing rows.
    alter table public.orders add constraint orders_customer_phone_check check (customer_phone ~ '^\+91[6-9][0-9]{9}$') not valid;
  end if;
end $$;

-- 2. Owner notification tracking.
alter table public.orders
  add column if not exists owner_email_status text not null default 'pending' check (owner_email_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  add column if not exists owner_delivery_attempts integer not null default 0,
  add column if not exists owner_email_claimed_at timestamptz,
  add column if not exists owner_email_sent_at timestamptz,
  add column if not exists last_owner_email_error text;

-- 3. The view exposes the new columns (they are appended, so CREATE OR REPLACE is allowed).
create or replace view public.orders_with_delivery with (security_invoker = true) as select * from public.orders;

-- 4. Order creation with the mobile number (the app calls this 9-argument version).
create or replace function public.create_order(p_id text, p_product_id text, p_name text, p_email text, p_phone text, p_locale text, p_amount integer, p_currency text, p_razorpay_order_id text)
returns void language sql security definer set search_path = public as $$
  insert into orders (id, product_id, customer_name, customer_email, customer_phone, locale, amount, currency, razorpay_order_id)
  values (p_id, p_product_id, p_name, lower(p_email), p_phone, p_locale, p_amount, p_currency, p_razorpay_order_id);
$$;

-- 5. Owner notification: atomic claim (a 'sending' claim older than 5 minutes can be re-claimed) and result.
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

-- 6. Only the server (service role) may call these. Argument lists are explicit because create_order
--    may also exist in its older 8-argument form, which stays in place untouched.
revoke all on function public.create_order(text, text, text, text, text, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.claim_owner_email_delivery(text) from public, anon, authenticated;
revoke all on function public.record_owner_email_result(text, boolean, text) from public, anon, authenticated;
