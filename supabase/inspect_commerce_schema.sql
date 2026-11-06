-- READ-ONLY inspection of the CRAFT & CODE commerce schema. Changes nothing.
-- Paste into Supabase → SQL Editor and run. Every row shows one expected object and whether it exists.
-- Interpretation:
--   all "001" rows true + all "002" rows true  → Scenario C: both applied, run nothing.
--   all "001" rows true + some "002" rows false → Scenario A: run ONLY 002_owner_notifications.sql.
--   "orders table" false                        → Scenario B: run 001_commerce.sql (it already includes 002).
--   anything else (partial 001)                 → stop; send the result before running anything.
with checks(migration, object, present) as (
  values
  -- tables
  ('001', 'orders table',            to_regclass('public.orders') is not null),
  ('001', 'webhook_events table',    to_regclass('public.webhook_events') is not null),
  ('001', 'access_tokens table',     to_regclass('public.access_tokens') is not null),
  ('001', 'orders_with_delivery view', to_regclass('public.orders_with_delivery') is not null),
  -- core columns
  ('001', 'orders.email_status',     exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='email_status')),
  ('001', 'orders.delivery_attempts',exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='delivery_attempts')),
  ('001', 'orders.download_count',   exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='download_count')),
  -- columns added later (in current 001, or by 002)
  ('002', 'orders.customer_phone',   exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customer_phone')),
  ('002', 'orders.owner_email_status', exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='owner_email_status')),
  ('002', 'orders.owner_delivery_attempts', exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='owner_delivery_attempts')),
  ('002', 'orders.owner_email_claimed_at', exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='owner_email_claimed_at')),
  ('002', 'orders.owner_email_sent_at', exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='owner_email_sent_at')),
  ('002', 'orders.last_owner_email_error', exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='last_owner_email_error')),
  ('002', 'view exposes owner_email_status', exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders_with_delivery' and column_name='owner_email_status')),
  -- functions
  ('001', 'fn mark_order_paid(text,text)',            to_regprocedure('public.mark_order_paid(text,text)') is not null),
  ('001', 'fn claim_email_delivery(text)',            to_regprocedure('public.claim_email_delivery(text)') is not null),
  ('001', 'fn record_email_result(text,boolean,text)',to_regprocedure('public.record_email_result(text,boolean,text)') is not null),
  ('001', 'fn record_download(text,date,integer)',    to_regprocedure('public.record_download(text,date,integer)') is not null),
  ('001', 'fn touch_updated_at()',                    to_regprocedure('public.touch_updated_at()') is not null),
  ('002', 'fn create_order (9 args, with phone)',     to_regprocedure('public.create_order(text,text,text,text,text,text,integer,text,text)') is not null),
  ('002', 'fn claim_owner_email_delivery(text)',      to_regprocedure('public.claim_owner_email_delivery(text)') is not null),
  ('002', 'fn record_owner_email_result(text,boolean,text)', to_regprocedure('public.record_owner_email_result(text,boolean,text)') is not null),
  -- trigger, indexes, constraints
  ('001', 'trigger orders_touch',    exists (select 1 from pg_trigger where tgname='orders_touch' and tgrelid=to_regclass('public.orders'))),
  ('001', 'index orders_email_idx',  to_regclass('public.orders_email_idx') is not null),
  ('001', 'index orders_status_idx', to_regclass('public.orders_status_idx') is not null),
  ('001', 'index orders_created_idx',to_regclass('public.orders_created_idx') is not null),
  ('001', 'index access_tokens_order_idx', to_regclass('public.access_tokens_order_idx') is not null),
  ('001', 'unique razorpay_order_id', exists (select 1 from pg_constraint where conrelid=to_regclass('public.orders') and contype='u' and pg_get_constraintdef(oid) like '%(razorpay_order_id)%')),
  ('001', 'unique razorpay_payment_id', exists (select 1 from pg_constraint where conrelid=to_regclass('public.orders') and contype='u' and pg_get_constraintdef(oid) like '%(razorpay_payment_id)%')),
  -- RLS (must be ON; no policies expected → anon/authenticated can read nothing)
  ('001', 'RLS on orders',           coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.orders')), false)),
  ('001', 'RLS on webhook_events',   coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.webhook_events')), false)),
  ('001', 'RLS on access_tokens',    coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.access_tokens')), false)),
  ('001', 'no RLS policies (expected: true)', not exists (select 1 from pg_policies where schemaname='public' and tablename in ('orders','webhook_events','access_tokens'))),
  ('001', 'view is security_invoker', coalesce((select 'security_invoker=true' = any(reloptions) from pg_class where oid=to_regclass('public.orders_with_delivery')), false)),
  -- permissions (anon must NOT be able to call the functions; expected: true)
  ('001', 'anon cannot run mark_order_paid', case when to_regprocedure('public.mark_order_paid(text,text)') is null then false else not has_function_privilege('anon', 'public.mark_order_paid(text,text)', 'execute') end),
  ('001', 'anon cannot run record_download', case when to_regprocedure('public.record_download(text,date,integer)') is null then false else not has_function_privilege('anon', 'public.record_download(text,date,integer)', 'execute') end),
  ('002', 'anon cannot run claim_owner_email_delivery', case when to_regprocedure('public.claim_owner_email_delivery(text)') is null then false else not has_function_privilege('anon', 'public.claim_owner_email_delivery(text)', 'execute') end),
  ('002', 'service_role can run claim_owner_email_delivery', case when to_regprocedure('public.claim_owner_email_delivery(text)') is null then false else has_function_privilege('service_role', 'public.claim_owner_email_delivery(text)', 'execute') end)
)
select migration, object, present from checks order by present, migration, object;

-- Run separately to record row counts before and after (should be identical):
-- select (select count(*) from public.orders) as orders, (select count(*) from public.webhook_events) as webhook_events, (select count(*) from public.access_tokens) as access_tokens;
-- Migration history (only if you used the Supabase CLI; the SQL Editor doesn't record runs):
-- select version, name from supabase_migrations.schema_migrations order by version;
