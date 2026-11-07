-- Migration 005: per-channel stop requests and an audit trail for consent recorded by the admin.
-- See docs/CHECKOUT_RECOVERY.md. Additive and idempotent: no existing row, table or column changes.
--   * channel_suppressions: a stop for ONE channel (email or whatsapp). The existing
--     email_suppressions table stays the GLOBAL stop list (blocks every channel).
--   * consent_records: append-only log of consent the admin recorded after a genuine customer
--     interaction (e.g. the customer asked on WhatsApp to be contacted). Rows can't be changed.
--   * record_admin_consent(): the only way to record it. It stamps the SERVER's time (no date
--     parameter, so consent can't be backdated), refuses paid/refunded orders, and requires a
--     source and an evidence note.

do $$
begin
  if to_regclass('public.recovery_messages') is null then
    raise exception 'Run 003_checkout_recovery.sql first.';
  end if;
end $$;

create table if not exists public.channel_suppressions (
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  channel    text not null check (channel in ('email', 'whatsapp')),
  reason     text not null check (reason in ('unsubscribe', 'admin')),
  created_at timestamptz not null default now(),
  primary key (email_hash, channel)
);

create table if not exists public.consent_records (
  id              bigint generated always as identity primary key,
  order_id        text not null references public.orders (id),
  channel         text not null check (channel in ('email', 'whatsapp')),
  source          text not null check (source in ('email_reply', 'whatsapp_message', 'phone_call', 'in_person', 'other')),
  evidence        text not null check (char_length(evidence) between 5 and 300),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  recorded_by     text not null check (char_length(recorded_by) between 1 and 100),
  recorded_at     timestamptz not null default now()
);
create index if not exists consent_records_order_idx on public.consent_records (order_id);

-- Append-only: an audit trail that can be edited isn't one.
create or replace function public.consent_records_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'consent_records is append-only';
end $$;
drop trigger if exists consent_records_no_update on public.consent_records;
create trigger consent_records_no_update before update or delete on public.consent_records
  for each row execute function public.consent_records_immutable();

create or replace function public.record_admin_consent(p_order_id text, p_channel text, p_source text, p_evidence text, p_version text, p_by text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_at timestamptz := now();   -- server time only: no backdating
begin
  select payment_status into v_status from orders where id = p_order_id for update;
  if v_status is null then raise exception 'order not found'; end if;
  if v_status in ('paid', 'refunded') then raise exception 'order is %, consent for checkout recovery is not needed', v_status; end if;
  insert into consent_records (order_id, channel, source, evidence, consent_version, recorded_by, recorded_at)
  values (p_order_id, p_channel, p_source, btrim(p_evidence), p_version, p_by, v_at);
  if p_channel = 'email' then
    update orders set reminder_email_consent_at = v_at where id = p_order_id and reminder_email_consent_at is null;
  else
    update orders set reminder_whatsapp_consent_at = v_at where id = p_order_id and reminder_whatsapp_consent_at is null;
  end if;
  return v_at;
end $$;

alter table public.channel_suppressions enable row level security;
alter table public.consent_records      enable row level security;
revoke all on table public.channel_suppressions, public.consent_records from anon, authenticated;
revoke all on function public.record_admin_consent(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_admin_consent(text, text, text, text, text, text) to service_role;
revoke all on function public.consent_records_immutable() from public, anon, authenticated;
