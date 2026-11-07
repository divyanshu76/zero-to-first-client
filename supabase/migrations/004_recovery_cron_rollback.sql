-- Rollback for 004_recovery_cron.sql: stops the scheduler. Changes no table or order data.
-- (The fastest stop is "Disable automation" in /admin/recovery; this removes the job entirely.)
-- Safe to run whether or not pg_cron is installed, and safe to run twice.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Dynamic SQL: cron.job is only looked up when pg_cron exists (a static reference would fail to
    -- parse on a database without it, even inside this IF).
    execute $q$select cron.unschedule(jobid) from cron.job where jobname = 'ztfc-recovery'$q$;
  else
    raise notice 'pg_cron is not installed: no scheduled job to remove.';
  end if;
end $$;
drop function if exists public.recovery_cron_tick();
-- pg_cron / pg_net and the Vault secret are left in place; remove the secret in Vault → Secrets if wanted.
