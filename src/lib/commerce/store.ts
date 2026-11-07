import "server-only";
import { storeDriver, supabaseConfig } from "./config";

export type OrderStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
export type EmailStatus = "pending" | "sending" | "sent" | "failed";

export type Order = {
  id: string; // internal order id (ord_…)
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  locale: "en" | "hi";
  amount: number; // paise
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  // delivery
  emailStatus: EmailStatus;
  emailAttempts: number;
  emailSentAt: string | null;
  lastEmailError: string | null;
  ownerEmailStatus: EmailStatus | "skipped";
  ownerEmailAttempts: number;
  ownerEmailSentAt: string | null;
  lastOwnerEmailError: string | null;
  downloadCount: number;
  downloadsToday: number;
  downloadDay: string | null;
  lastDownloadAt: string | null;
  // checkout recovery (migration 003): opt-in times; null = no consent
  emailConsentAt: string | null;
  whatsappConsentAt: string | null;
  consentVersion: string | null;
  recoveredFromOrderId: string | null;
};

export type RecoveryChannel = "email" | "whatsapp";
export type RecoveryStage = "auto_1" | "auto_2" | "manual";
export type RecoveryMessage = {
  id: string;
  orderId: string;
  channel: RecoveryChannel;
  stage: RecoveryStage;
  status: "sending" | "sent" | "failed" | "opened";
  idempotencyKey: string;
  triggeredBy: "scheduler" | "admin";
  attempts: number;
  providerMessageId: string | null;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
};
export type RecoverySettings = { automationEnabled: boolean; pausedUntil: string | null; dailyCap: number; updatedAt: string };
export type RecoveryRun = { id: string; trigger: "cron" | "admin"; startedAt: string; finishedAt: string | null; status: "running" | "ok" | "skipped" | "error"; examined: number; sent: number; skipped: number; failed: number; recovered: number; note: string | null };
export type RunResult = Pick<RecoveryRun, "status" | "examined" | "sent" | "skipped" | "failed" | "recovered" | "note">;
export type Consent = { emailAt: string | null; whatsappAt: string | null; version: string; recoveredFromOrderId: string | null };
type ClaimInput = Pick<RecoveryMessage, "orderId" | "channel" | "stage" | "idempotencyKey" | "triggeredBy"> & { status?: "sending" | "opened" };
type TokenPurpose = "resume" | "unsubscribe";

export type NewOrder = Pick<Order, "id" | "productId" | "customerName" | "customerEmail" | "customerPhone" | "locale" | "amount" | "currency" | "razorpayOrderId">;

export interface OrderStore {
  createOrder(o: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  getByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null>;
  /** Atomic: pending/processing/failed/cancelled → paid. `newlyPaid` is true for exactly one caller. */
  markPaid(razorpayOrderId: string, paymentId: string): Promise<{ order: Order | null; newlyPaid: boolean }>;
  markProcessing(razorpayOrderId: string, paymentId: string): Promise<Order | null>;
  /** Only an unpaid order can fail; a later successful retry can still pay it. */
  markFailed(razorpayOrderId: string, paymentId: string | null): Promise<Order | null>;
  markCancelled(orderId: string): Promise<Order | null>;
  markRefunded(razorpayOrderId: string): Promise<Order | null>;
  /** Insert-if-absent. True only the first time an event id is seen. */
  recordWebhookEvent(eventId: string, type: string): Promise<boolean>;
  /** Forget an event whose processing failed, so Razorpay's retry is processed again. */
  forgetWebhookEvent(eventId: string): Promise<void>;
  addAccessToken(orderId: string, tokenHash: string, expiresAt: string): Promise<void>;
  findAccessToken(tokenHash: string): Promise<{ orderId: string; expiresAt: string } | null>;
  /** Atomic claim of the email send (pending/failed → sending, max 5 attempts). */
  claimEmail(orderId: string): Promise<boolean>;
  recordEmailResult(orderId: string, ok: boolean, error?: string): Promise<void>;
  /** Atomic claim of the owner notification send (pending/failed → sending, max 5 attempts). */
  claimOwnerEmail(orderId: string): Promise<boolean>;
  recordOwnerEmailResult(orderId: string, ok: boolean, error?: string): Promise<void>;
  /** Atomic per-day download counter; false when the daily limit is reached. */
  /** Counts a download for the dashboard. Analytics only: it never blocks a paid buyer. */
  recordDownload(orderId: string, day: string): Promise<void>;
  listOrders(limit: number): Promise<Order[]>;
  /** Most recent verified webhook events (only signature-verified events are ever stored). */
  listWebhookEvents(limit: number): Promise<{ eventId: string; type: string; receivedAt: string }[]>;
  paidOrdersByEmail(email: string): Promise<Order[]>;

  /* ── Checkout recovery (migration 003) ── */
  /** Records opt-in consent (and resume attribution) on a freshly created order. */
  setConsent(orderId: string, c: Consent): Promise<void>;
  /** Every order for one (lower-cased) email, newest first. */
  ordersByEmail(email: string): Promise<Order[]>;
  /** Orders with any reminder consent created at/after `sinceIso`, oldest first. */
  consentedOrdersSince(sinceIso: string): Promise<Order[]>;
  messagesForOrders(orderIds: string[]): Promise<RecoveryMessage[]>;
  listRecoveryMessages(sinceIso: string, limit: number): Promise<RecoveryMessage[]>;
  /** Insert-if-absent by idempotency key (and once per order for automatic stages). Null = already exists. */
  claimRecoveryMessage(m: ClaimInput): Promise<RecoveryMessage | null>;
  /** Atomic failed → sending for a retry (max 5 attempts). Null when not retryable. */
  retryRecoveryMessage(id: string): Promise<RecoveryMessage | null>;
  recordRecoveryResult(id: string, ok: boolean, providerMessageId: string | null, error?: string): Promise<void>;
  getRecoverySettings(): Promise<RecoverySettings>;
  updateRecoverySettings(patch: Partial<Pick<RecoverySettings, "automationEnabled" | "pausedUntil" | "dailyCap">>): Promise<RecoverySettings>;
  /** Atomic lease so only one scheduler run / bulk send works at a time. */
  acquireRecoveryLock(kind: "run" | "bulk", ms: number): Promise<boolean>;
  releaseRecoveryLock(kind: "run" | "bulk"): Promise<void>;
  /** Null when the nonce was already used (a replayed scheduler call). */
  startRecoveryRun(trigger: "cron" | "admin", nonce: string | null): Promise<string | null>;
  finishRecoveryRun(id: string, r: RunResult): Promise<void>;
  listRecoveryRuns(limit: number): Promise<RecoveryRun[]>;
  isSuppressed(emailHash: string): Promise<boolean>;
  addSuppression(emailHash: string, reason: "unsubscribe" | "admin"): Promise<void>;
  addRecoveryToken(tokenHash: string, orderId: string, purpose: TokenPurpose, expiresAt: string): Promise<void>;
  findRecoveryToken(tokenHash: string): Promise<{ orderId: string; purpose: TokenPurpose; expiresAt: string } | null>;
}

const now = () => new Date().toISOString();

/* ── In-memory store: development and automated tests only ─────────────── */

type Mem = { orders: Map<string, Order>; byRzp: Map<string, string>; payments: Set<string>; events: Map<string, { type: string; at: string }>; tokens: Map<string, { orderId: string; expiresAt: string }> };
type RecoveryMem = { messages: RecoveryMessage[]; seq: number; settings: RecoverySettings; locks: Record<"run" | "bulk", number>; runs: RecoveryRun[]; nonces: Set<string>; suppressed: Set<string>; tokens: Map<string, { orderId: string; purpose: TokenPurpose; expiresAt: string }> };
const g = globalThis as unknown as { __ztfcMem?: Mem; __ztfcRecovery?: RecoveryMem };

class MemoryStore implements OrderStore {
  private m: Mem = (g.__ztfcMem ??= { orders: new Map(), byRzp: new Map(), payments: new Set(), events: new Map(), tokens: new Map() });

  async createOrder(o: NewOrder) {
    const order: Order = {
      ...o, razorpayPaymentId: null, status: "pending", createdAt: now(), paidAt: null,
      emailStatus: "pending", emailAttempts: 0, emailSentAt: null, lastEmailError: null,
      ownerEmailStatus: "pending", ownerEmailAttempts: 0, ownerEmailSentAt: null, lastOwnerEmailError: null,
      downloadCount: 0, downloadsToday: 0, downloadDay: null, lastDownloadAt: null,
      emailConsentAt: null, whatsappConsentAt: null, consentVersion: null, recoveredFromOrderId: null,
    };
    this.m.orders.set(order.id, order);
    this.m.byRzp.set(order.razorpayOrderId, order.id);
    return { ...order };
  }
  async getOrder(id: string) { const o = this.m.orders.get(id); return o ? { ...o } : null; }
  async getByRazorpayOrderId(rid: string) { const id = this.m.byRzp.get(rid); return id ? this.getOrder(id) : null; }
  private raw(rid: string) { const id = this.m.byRzp.get(rid); return id ? this.m.orders.get(id) ?? null : null; }

  async markPaid(rid: string, paymentId: string) {
    const o = this.raw(rid);
    if (!o) return { order: null, newlyPaid: false };
    if (o.status === "paid" || o.status === "refunded") return { order: { ...o }, newlyPaid: false };
    if (this.m.payments.has(paymentId) && o.razorpayPaymentId !== paymentId) return { order: { ...o }, newlyPaid: false }; // unique payment id
    o.status = "paid"; o.razorpayPaymentId = paymentId; o.paidAt = now();
    this.m.payments.add(paymentId);
    return { order: { ...o }, newlyPaid: true };
  }
  async markProcessing(rid: string, paymentId: string) {
    const o = this.raw(rid);
    if (o && (o.status === "pending" || o.status === "failed" || o.status === "cancelled")) { o.status = "processing"; o.razorpayPaymentId = paymentId; }
    return o ? { ...o } : null;
  }
  async markFailed(rid: string, paymentId: string | null) {
    const o = this.raw(rid);
    if (o && (o.status === "pending" || o.status === "processing" || o.status === "cancelled")) { o.status = "failed"; if (paymentId) o.razorpayPaymentId = paymentId; }
    return o ? { ...o } : null;
  }
  async markCancelled(id: string) {
    const o = this.m.orders.get(id);
    if (o && o.status === "pending") o.status = "cancelled";
    return o ? { ...o } : null;
  }
  async markRefunded(rid: string) {
    const o = this.raw(rid);
    if (o && o.status === "paid") o.status = "refunded";
    return o ? { ...o } : null;
  }
  async recordWebhookEvent(eventId: string, type: string) { if (this.m.events.has(eventId)) return false; this.m.events.set(eventId, { type, at: now() }); return true; }
  async listWebhookEvents(limit: number) { return [...this.m.events].map(([eventId, e]) => ({ eventId, type: e.type, receivedAt: e.at })).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, limit); }
  async forgetWebhookEvent(eventId: string) { this.m.events.delete(eventId); }
  async addAccessToken(orderId: string, tokenHash: string, expiresAt: string) { this.m.tokens.set(tokenHash, { orderId, expiresAt }); }
  async findAccessToken(tokenHash: string) { const t = this.m.tokens.get(tokenHash); return t ? { ...t } : null; }
  async claimEmail(orderId: string) {
    const o = this.m.orders.get(orderId);
    if (!o || o.status !== "paid" || !(o.emailStatus === "pending" || o.emailStatus === "failed") || o.emailAttempts >= 5) return false;
    o.emailStatus = "sending"; o.emailAttempts += 1;
    return true;
  }
  async recordEmailResult(orderId: string, ok: boolean, error?: string) {
    const o = this.m.orders.get(orderId);
    if (!o) return;
    o.emailStatus = ok ? "sent" : "failed"; o.emailSentAt = ok ? now() : o.emailSentAt; o.lastEmailError = ok ? null : (error ?? "unknown").slice(0, 300);
  }
  async claimOwnerEmail(orderId: string) {
    const o = this.m.orders.get(orderId);
    if (!o || o.status !== "paid" || !(o.ownerEmailStatus === "pending" || o.ownerEmailStatus === "failed") || o.ownerEmailAttempts >= 5) return false;
    o.ownerEmailStatus = "sending"; o.ownerEmailAttempts += 1;
    return true;
  }
  async recordOwnerEmailResult(orderId: string, ok: boolean, error?: string) {
    const o = this.m.orders.get(orderId);
    if (!o) return;
    o.ownerEmailStatus = ok ? "sent" : "failed"; o.ownerEmailSentAt = ok ? now() : o.ownerEmailSentAt; o.lastOwnerEmailError = ok ? null : (error ?? "unknown").slice(0, 300);
  }
  async recordDownload(orderId: string, day: string) {
    const o = this.m.orders.get(orderId);
    if (!o) return;
    if (o.downloadDay !== day) { o.downloadDay = day; o.downloadsToday = 0; }
    o.downloadsToday += 1; o.downloadCount += 1; o.lastDownloadAt = now();
  }
  async listOrders(limit: number) { return [...this.m.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map((o) => ({ ...o })); }
  async paidOrdersByEmail(email: string) { return [...this.m.orders.values()].filter((o) => o.status === "paid" && o.customerEmail === email).map((o) => ({ ...o })); }

  /* ── recovery ── */
  private r: RecoveryMem = (g.__ztfcRecovery ??= { messages: [], seq: 0, settings: { automationEnabled: false, pausedUntil: null, dailyCap: 30, updatedAt: now() }, locks: { run: 0, bulk: 0 }, runs: [], nonces: new Set(), suppressed: new Set(), tokens: new Map() });
  async setConsent(orderId: string, c: Consent) {
    const o = this.m.orders.get(orderId);
    if (!o) return;
    o.emailConsentAt = c.emailAt; o.whatsappConsentAt = c.whatsappAt; o.consentVersion = c.version;
    if (c.recoveredFromOrderId && this.m.orders.has(c.recoveredFromOrderId)) o.recoveredFromOrderId = c.recoveredFromOrderId;
  }
  async ordersByEmail(email: string) { return [...this.m.orders.values()].filter((o) => o.customerEmail === email).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => ({ ...o })); }
  async consentedOrdersSince(sinceIso: string) {
    return [...this.m.orders.values()].filter((o) => (o.emailConsentAt || o.whatsappConsentAt) && o.createdAt >= sinceIso).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((o) => ({ ...o }));
  }
  async messagesForOrders(ids: string[]) { const set = new Set(ids); return this.r.messages.filter((m) => set.has(m.orderId)).map((m) => ({ ...m })); }
  async listRecoveryMessages(sinceIso: string, limit: number) { return this.r.messages.filter((m) => m.createdAt >= sinceIso).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map((m) => ({ ...m })); }
  async claimRecoveryMessage(m: ClaimInput) {
    if (!this.m.orders.has(m.orderId)) throw new Error("unknown order");
    if (this.r.messages.some((x) => x.idempotencyKey === m.idempotencyKey)) return null;
    if (m.channel === "email" && m.stage !== "manual" && this.r.messages.some((x) => x.orderId === m.orderId && x.channel === "email" && x.stage === m.stage)) return null;
    const row: RecoveryMessage = { id: String(++this.r.seq), orderId: m.orderId, channel: m.channel, stage: m.stage, status: m.status ?? "sending", idempotencyKey: m.idempotencyKey, triggeredBy: m.triggeredBy, attempts: 1, providerMessageId: null, error: null, createdAt: now(), sentAt: null };
    this.r.messages.push(row);
    return { ...row };
  }
  async retryRecoveryMessage(id: string) {
    const x = this.r.messages.find((m) => m.id === id);
    if (!x || x.status !== "failed" || x.attempts >= 5) return null;
    x.status = "sending"; x.attempts += 1;
    return { ...x };
  }
  async recordRecoveryResult(id: string, ok: boolean, providerMessageId: string | null, error?: string) {
    const x = this.r.messages.find((m) => m.id === id);
    if (!x) return;
    x.status = ok ? "sent" : "failed"; x.sentAt = ok ? now() : x.sentAt; x.providerMessageId = providerMessageId; x.error = ok ? null : (error ?? "unknown").slice(0, 300);
  }
  async getRecoverySettings() { return { ...this.r.settings }; }
  async updateRecoverySettings(patch: Partial<Pick<RecoverySettings, "automationEnabled" | "pausedUntil" | "dailyCap">>) {
    Object.assign(this.r.settings, patch, { updatedAt: now() });
    return { ...this.r.settings };
  }
  async acquireRecoveryLock(kind: "run" | "bulk", ms: number) {
    if (this.r.locks[kind] > Date.now()) return false;
    this.r.locks[kind] = Date.now() + ms;
    return true;
  }
  async releaseRecoveryLock(kind: "run" | "bulk") { this.r.locks[kind] = 0; }
  async startRecoveryRun(trigger: "cron" | "admin", nonce: string | null) {
    if (nonce) {
      if (this.r.nonces.has(nonce)) return null;
      this.r.nonces.add(nonce);
    }
    const run: RecoveryRun = { id: String(this.r.runs.length + 1), trigger, startedAt: now(), finishedAt: null, status: "running", examined: 0, sent: 0, skipped: 0, failed: 0, recovered: 0, note: null };
    this.r.runs.push(run);
    return run.id;
  }
  async finishRecoveryRun(id: string, res: RunResult) {
    const run = this.r.runs.find((x) => x.id === id);
    if (run) Object.assign(run, res, { finishedAt: now(), note: res.note?.slice(0, 300) ?? null });
  }
  async listRecoveryRuns(limit: number) { return [...this.r.runs].reverse().slice(0, limit).map((x) => ({ ...x })); }
  async isSuppressed(h: string) { return this.r.suppressed.has(h); }
  async addSuppression(h: string) { this.r.suppressed.add(h); }
  async addRecoveryToken(h: string, orderId: string, purpose: TokenPurpose, expiresAt: string) {
    if (this.r.tokens.has(h)) throw Object.assign(new Error("conflict"), { conflict: true });
    this.r.tokens.set(h, { orderId, purpose, expiresAt });
  }
  async findRecoveryToken(h: string) { const t = this.r.tokens.get(h); return t ? { ...t } : null; }
}

/* ── Supabase (Postgres via PostgREST) — see supabase/migrations/001_commerce.sql ── */

type Row = Record<string, unknown>;
const toOrder = (r: Row): Order => ({
  id: r.id as string, productId: r.product_id as string, customerName: r.customer_name as string, customerEmail: r.customer_email as string, customerPhone: (r.customer_phone as string) ?? null,
  locale: (r.locale as "en" | "hi") ?? "en", amount: Number(r.amount), currency: r.currency as string, razorpayOrderId: r.razorpay_order_id as string,
  razorpayPaymentId: (r.razorpay_payment_id as string) ?? null, status: r.payment_status as OrderStatus, createdAt: r.created_at as string, paidAt: (r.paid_at as string) ?? null,
  emailStatus: (r.email_status as EmailStatus) ?? "pending", emailAttempts: Number(r.delivery_attempts ?? 0), emailSentAt: (r.email_sent_at as string) ?? null,
  lastEmailError: (r.last_email_error as string) ?? null,
  ownerEmailStatus: (r.owner_email_status as EmailStatus | "skipped") ?? "pending", ownerEmailAttempts: Number(r.owner_delivery_attempts ?? 0), ownerEmailSentAt: (r.owner_email_sent_at as string) ?? null,
  lastOwnerEmailError: (r.last_owner_email_error as string) ?? null,
  downloadCount: Number(r.download_count ?? 0), downloadsToday: Number(r.downloads_today ?? 0),
  downloadDay: (r.download_day as string) ?? null, lastDownloadAt: (r.last_download_at as string) ?? null,
  // Absent before migration 003 → null (no consent: never contacted).
  emailConsentAt: (r.reminder_email_consent_at as string) ?? null, whatsappConsentAt: (r.reminder_whatsapp_consent_at as string) ?? null,
  consentVersion: (r.consent_version as string) ?? null, recoveredFromOrderId: (r.recovered_from_order_id as string) ?? null,
});
const toMessage = (r: Row): RecoveryMessage => ({
  id: String(r.id), orderId: r.order_id as string, channel: r.channel as RecoveryChannel, stage: r.stage as RecoveryStage, status: r.status as RecoveryMessage["status"],
  idempotencyKey: r.idempotency_key as string, triggeredBy: r.triggered_by as RecoveryMessage["triggeredBy"], attempts: Number(r.attempts ?? 1),
  providerMessageId: (r.provider_message_id as string) ?? null, error: (r.error as string) ?? null, createdAt: r.created_at as string, sentAt: (r.sent_at as string) ?? null,
});
const toSettings = (r: Row): RecoverySettings => ({ automationEnabled: r.automation_enabled === true, pausedUntil: (r.paused_until as string) ?? null, dailyCap: Number(r.daily_cap ?? 30), updatedAt: r.updated_at as string });
const toRun = (r: Row): RecoveryRun => ({
  id: String(r.id), trigger: r.trigger as RecoveryRun["trigger"], startedAt: r.started_at as string, finishedAt: (r.finished_at as string) ?? null, status: r.status as RecoveryRun["status"],
  examined: Number(r.examined ?? 0), sent: Number(r.sent ?? 0), skipped: Number(r.skipped ?? 0), failed: Number(r.failed ?? 0), recovered: Number(r.recovered ?? 0), note: (r.note as string) ?? null,
});
const enc = encodeURIComponent;
/** PostgREST in.(...) list; ids are our own ord_… values, quoted defensively. */
const inList = (ids: string[]) => `(${ids.map((i) => `"${i.replace(/["\\,()]/g, "")}"`).join(",")})`;

class SupabaseStore implements OrderStore {
  private cfg = supabaseConfig();
  private async req<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
    if (!this.cfg) throw new Error("Supabase is not configured");
    const res = await fetch(`${this.cfg.url}/rest/v1${path}`, {
      ...init,
      headers: { apikey: this.cfg.key, authorization: `Bearer ${this.cfg.key}`, "content-type": "application/json", ...(init.prefer ? { prefer: init.prefer } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 409) throw Object.assign(new Error("conflict"), { conflict: true });
    if (!res.ok) throw new Error(`Database request failed (${res.status})`);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }
  private rpc<T>(fn: string, args: Row) { return this.req<T>(`/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }); }
  private one = async (q: string) => { const rows = await this.req<Row[]>(`/orders_with_delivery?${q}&limit=1`); return rows[0] ? toOrder(rows[0]) : null; };

  async createOrder(o: NewOrder) {
    await this.rpc("create_order", { p_id: o.id, p_product_id: o.productId, p_name: o.customerName, p_email: o.customerEmail, p_phone: o.customerPhone, p_locale: o.locale, p_amount: o.amount, p_currency: o.currency, p_razorpay_order_id: o.razorpayOrderId });
    return (await this.getOrder(o.id))!;
  }
  getOrder(id: string) { return this.one(`id=eq.${encodeURIComponent(id)}`); }
  getByRazorpayOrderId(rid: string) { return this.one(`razorpay_order_id=eq.${encodeURIComponent(rid)}`); }
  async markPaid(rid: string, paymentId: string) {
    const newlyPaid = await this.rpc<boolean>("mark_order_paid", { p_razorpay_order_id: rid, p_payment_id: paymentId });
    return { order: await this.getByRazorpayOrderId(rid), newlyPaid: newlyPaid === true };
  }
  async markProcessing(rid: string, paymentId: string) {
    await this.req(`/orders?razorpay_order_id=eq.${encodeURIComponent(rid)}&payment_status=in.(pending,failed,cancelled)`, { method: "PATCH", body: JSON.stringify({ payment_status: "processing", razorpay_payment_id: paymentId }) });
    return this.getByRazorpayOrderId(rid);
  }
  async markFailed(rid: string, paymentId: string | null) {
    await this.req(`/orders?razorpay_order_id=eq.${encodeURIComponent(rid)}&payment_status=in.(pending,processing,cancelled)`, { method: "PATCH", body: JSON.stringify({ payment_status: "failed", ...(paymentId ? { razorpay_payment_id: paymentId } : {}) }) });
    return this.getByRazorpayOrderId(rid);
  }
  async markCancelled(id: string) {
    await this.req(`/orders?id=eq.${encodeURIComponent(id)}&payment_status=eq.pending`, { method: "PATCH", body: JSON.stringify({ payment_status: "cancelled" }) });
    return this.getOrder(id);
  }
  async markRefunded(rid: string) {
    await this.req(`/orders?razorpay_order_id=eq.${encodeURIComponent(rid)}&payment_status=eq.paid`, { method: "PATCH", body: JSON.stringify({ payment_status: "refunded" }) });
    return this.getByRazorpayOrderId(rid);
  }
  async recordWebhookEvent(eventId: string, type: string) {
    try {
      await this.req(`/webhook_events`, { method: "POST", body: JSON.stringify({ event_id: eventId, event_type: type }), prefer: "return=minimal" });
      return true;
    } catch (e) {
      if ((e as { conflict?: boolean }).conflict) return false;
      throw e;
    }
  }
  async listWebhookEvents(limit: number) {
    const rows = await this.req<Row[]>(`/webhook_events?select=event_id,event_type,received_at&order=received_at.desc&limit=${limit}`);
    return rows.map((r) => ({ eventId: r.event_id as string, type: r.event_type as string, receivedAt: r.received_at as string }));
  }
  async forgetWebhookEvent(eventId: string) { await this.req(`/webhook_events?event_id=eq.${encodeURIComponent(eventId)}`, { method: "DELETE" }); }
  async addAccessToken(orderId: string, tokenHash: string, expiresAt: string) {
    await this.req(`/access_tokens`, { method: "POST", body: JSON.stringify({ token_hash: tokenHash, order_id: orderId, expires_at: expiresAt }), prefer: "return=minimal" });
  }
  async findAccessToken(tokenHash: string) {
    const rows = await this.req<Row[]>(`/access_tokens?token_hash=eq.${tokenHash}&select=order_id,expires_at&limit=1`);
    return rows[0] ? { orderId: rows[0].order_id as string, expiresAt: rows[0].expires_at as string } : null;
  }
  async claimEmail(orderId: string) { return (await this.rpc<boolean>("claim_email_delivery", { p_order_id: orderId })) === true; }
  async recordEmailResult(orderId: string, ok: boolean, error?: string) {
    await this.rpc("record_email_result", { p_order_id: orderId, p_ok: ok, p_error: ok ? null : (error ?? "unknown").slice(0, 300) });
  }
  async claimOwnerEmail(orderId: string) {
    try {
      return (await this.rpc<boolean>("claim_owner_email_delivery", { p_order_id: orderId })) === true;
    } catch {
      return false;
    }
  }
  async recordOwnerEmailResult(orderId: string, ok: boolean, error?: string) {
    try {
      await this.rpc("record_owner_email_result", { p_order_id: orderId, p_ok: ok, p_error: ok ? null : (error ?? "unknown").slice(0, 300) });
    } catch {}
  }
  async recordDownload(orderId: string, day: string) {
    // The existing SQL function takes a per-day maximum; an unreachable one keeps it a pure counter
    // (no schema change needed).
    await this.rpc("record_download", { p_order_id: orderId, p_day: day, p_max: 2147483647 });
  }
  async listOrders(limit: number) { return (await this.req<Row[]>(`/orders_with_delivery?order=created_at.desc&limit=${limit}`)).map(toOrder); }
  async paidOrdersByEmail(email: string) { return (await this.req<Row[]>(`/orders_with_delivery?customer_email=eq.${encodeURIComponent(email)}&payment_status=eq.paid`)).map(toOrder); }

  /* ── recovery (migration 003) ── */
  async setConsent(orderId: string, c: Consent) {
    await this.req(`/orders?id=eq.${enc(orderId)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ reminder_email_consent_at: c.emailAt, reminder_whatsapp_consent_at: c.whatsappAt, consent_version: c.version, ...(c.recoveredFromOrderId ? { recovered_from_order_id: c.recoveredFromOrderId } : {}) }),
    });
  }
  async ordersByEmail(email: string) { return (await this.req<Row[]>(`/orders_with_delivery?customer_email=eq.${enc(email)}&order=created_at.desc&limit=50`)).map(toOrder); }
  async consentedOrdersSince(sinceIso: string) {
    return (await this.req<Row[]>(`/orders_with_delivery?created_at=gte.${enc(sinceIso)}&or=(reminder_email_consent_at.not.is.null,reminder_whatsapp_consent_at.not.is.null)&order=created_at.asc&limit=1000`)).map(toOrder);
  }
  async messagesForOrders(ids: string[]) {
    if (!ids.length) return [];
    return (await this.req<Row[]>(`/recovery_messages?order_id=in.${enc(inList(ids))}&order=created_at.asc&limit=1000`)).map(toMessage);
  }
  async listRecoveryMessages(sinceIso: string, limit: number) { return (await this.req<Row[]>(`/recovery_messages?created_at=gte.${enc(sinceIso)}&order=created_at.desc&limit=${limit}`)).map(toMessage); }
  async claimRecoveryMessage(m: ClaimInput) {
    try {
      const rows = await this.req<Row[]>(`/recovery_messages`, {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({ order_id: m.orderId, channel: m.channel, stage: m.stage, status: m.status ?? "sending", idempotency_key: m.idempotencyKey, triggered_by: m.triggeredBy }),
      });
      return rows[0] ? toMessage(rows[0]) : null;
    } catch (e) {
      if ((e as { conflict?: boolean }).conflict) return null; // unique key: already claimed
      throw e;
    }
  }
  async retryRecoveryMessage(id: string) {
    const cur = await this.req<Row[]>(`/recovery_messages?id=eq.${enc(id)}&select=attempts&limit=1`);
    const attempts = Number(cur[0]?.attempts ?? 99);
    if (attempts >= 5) return null;
    // Compare-and-set on status AND attempts: only one concurrent retry can win.
    const rows = await this.req<Row[]>(`/recovery_messages?id=eq.${enc(id)}&status=eq.failed&attempts=eq.${attempts}`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify({ status: "sending", attempts: attempts + 1 }) });
    return rows[0] ? toMessage(rows[0]) : null;
  }
  async recordRecoveryResult(id: string, ok: boolean, providerMessageId: string | null, error?: string) {
    await this.req(`/recovery_messages?id=eq.${enc(id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify(ok ? { status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerMessageId?.slice(0, 100) ?? null, error: null } : { status: "failed", error: (error ?? "unknown").slice(0, 300) }),
    });
  }
  async getRecoverySettings() {
    const rows = await this.req<Row[]>(`/recovery_settings?id=eq.1&select=automation_enabled,paused_until,daily_cap,updated_at`);
    // No row (migration 003 not applied yet) = automation off, nothing may be sent.
    return rows[0] ? toSettings(rows[0]) : { automationEnabled: false, pausedUntil: null, dailyCap: 0, updatedAt: new Date(0).toISOString() };
  }
  async updateRecoverySettings(patch: Partial<Pick<RecoverySettings, "automationEnabled" | "pausedUntil" | "dailyCap">>) {
    const body: Row = { updated_at: new Date().toISOString() };
    if (patch.automationEnabled !== undefined) body.automation_enabled = patch.automationEnabled;
    if (patch.pausedUntil !== undefined) body.paused_until = patch.pausedUntil;
    if (patch.dailyCap !== undefined) body.daily_cap = patch.dailyCap;
    const rows = await this.req<Row[]>(`/recovery_settings?id=eq.1`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify(body) });
    if (!rows[0]) throw new Error("Recovery settings are missing (run migration 003)");
    return toSettings(rows[0]);
  }
  async acquireRecoveryLock(kind: "run" | "bulk", ms: number) {
    const col = kind === "run" ? "run_lock_until" : "bulk_lock_until";
    const q = new URLSearchParams({ id: "eq.1", or: `(${col}.is.null,${col}.lt."${new Date().toISOString()}")` });
    const rows = await this.req<Row[]>(`/recovery_settings?${q}`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify({ [col]: new Date(Date.now() + ms).toISOString() }) });
    return rows.length === 1;
  }
  async releaseRecoveryLock(kind: "run" | "bulk") {
    await this.req(`/recovery_settings?id=eq.1`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ [kind === "run" ? "run_lock_until" : "bulk_lock_until"]: null }) });
  }
  async startRecoveryRun(trigger: "cron" | "admin", nonce: string | null) {
    try {
      const rows = await this.req<Row[]>(`/recovery_runs`, { method: "POST", prefer: "return=representation", body: JSON.stringify({ trigger, nonce }) });
      return rows[0] ? String(rows[0].id) : null;
    } catch (e) {
      if ((e as { conflict?: boolean }).conflict) return null; // nonce already used
      throw e;
    }
  }
  async finishRecoveryRun(id: string, r: RunResult) {
    await this.req(`/recovery_runs?id=eq.${enc(id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ ...r, note: r.note?.slice(0, 300) ?? null, finished_at: new Date().toISOString() }) });
  }
  async listRecoveryRuns(limit: number) { return (await this.req<Row[]>(`/recovery_runs?order=started_at.desc&limit=${limit}`)).map(toRun); }
  async isSuppressed(h: string) { return (await this.req<Row[]>(`/email_suppressions?email_hash=eq.${enc(h)}&select=email_hash&limit=1`)).length > 0; }
  async addSuppression(h: string, reason: "unsubscribe" | "admin") {
    try {
      await this.req(`/email_suppressions`, { method: "POST", prefer: "return=minimal", body: JSON.stringify({ email_hash: h, reason }) });
    } catch (e) {
      if (!(e as { conflict?: boolean }).conflict) throw e; // already unsubscribed is fine
    }
  }
  async addRecoveryToken(h: string, orderId: string, purpose: TokenPurpose, expiresAt: string) {
    await this.req(`/recovery_tokens`, { method: "POST", prefer: "return=minimal", body: JSON.stringify({ token_hash: h, order_id: orderId, purpose, expires_at: expiresAt }) });
  }
  async findRecoveryToken(h: string) {
    const rows = await this.req<Row[]>(`/recovery_tokens?token_hash=eq.${enc(h)}&select=order_id,purpose,expires_at&limit=1`);
    return rows[0] ? { orderId: rows[0].order_id as string, purpose: rows[0].purpose as TokenPurpose, expiresAt: rows[0].expires_at as string } : null;
  }
}

let instance: OrderStore | null = null;
export function getStore(): OrderStore {
  instance ??= storeDriver() === "supabase" ? new SupabaseStore() : new MemoryStore();
  return instance;
}
