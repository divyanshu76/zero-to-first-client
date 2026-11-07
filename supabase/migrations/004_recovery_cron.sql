-- Migration 004: schedule Checkout Recovery with pg_cron + pg_net. See docs/CHECKOUT_RECOVERY.md.
--
-- Run ONLY after: (1) migration 003 is applied, (2) the code is deployed to Production with
-- RECOVERY_CRON_SECRET set in Vercel, and (3) the same value is stored in Supabase Vault under the
-- name 'recovery_cron_secret'. Automation stays OFF until the owner enables it in /admin/recovery,
-- so scheduling this job sends nothing by itself.
--
-- Security:
--   * The cron command contains no secret: it only calls public.recovery_cron_tick().
--   * The secret is read from Vault at run time and NEVER sent: the request carries only a
--     timestamp, a random nonce and an HMAC signature (valid 5 minutes, single use). pg_net keeps
--     request headers in net.http_request_queue until sent, so only that signature is ever there.
--   * recovery_cron_tick() cannot be called through the API (EXECUTE revoked from every API role).
-- Rollback: 004_recovery_cron_rollback.sql.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if to_regclass('public.recovery_runs') is null then
    raise exception 'Run 003_checkout_recovery.sql first.';
  end if;
  if not exists (select 1 from vault.secrets where name = 'recovery_cron_secret') then
    raise exception 'Vault secret recovery_cron_secret is missing. Create it first (docs/CHECKOUT_RECOVERY.md, "Setting up the scheduler").';
  end if;
end $$;

create or replace function public.recovery_cron_tick()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_ts     text := floor(extract(epoch from clock_timestamp()))::bigint::text;
  v_nonce  text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'recovery_cron_secret' limit 1;
  if v_secret is null or length(v_secret) < 32 then
    raise exception 'recovery_cron_secret is missing or shorter than 32 characters';
  end if;
  return net.http_post(
    url := 'https://craftandcode.tech/api/recovery/run',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-recovery-ts', v_ts,
      'x-recovery-nonce', v_nonce,
      'x-recovery-signature', encode(extensions.hmac('v1:' || v_ts || ':' || v_nonce, v_secret, 'sha256'), 'hex')
    ),
    timeout_milliseconds := 10000
  );
end $$;

revoke all on function public.recovery_cron_tick() from public, anon, authenticated, service_role;

-- Best-effort hardening: API roles don't need pg_net at all (the net schema isn't exposed through the
-- API either). Some grants belong to Supabase's admin role; if a revoke isn't permitted, a notice is
-- printed and nothing else changes.
do $$
begin
  begin
    revoke execute on all functions in schema net from anon, authenticated;
  exception when others then
    raise notice 'pg_net function privileges left unchanged: %', sqlerrm;
  end;
  begin
    revoke all on all tables in schema net from anon, authenticated;
  exception when others then
    raise notice 'pg_net table privileges left unchanged: %', sqlerrm;
  end;
end $$;

-- Every 5 minutes. cron.schedule with an existing job name updates that job (safe to re-run).
select cron.schedule('ztfc-recovery', '*/5 * * * *', 'select public.recovery_cron_tick();');
