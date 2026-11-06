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
};

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
}

const now = () => new Date().toISOString();

/* ── In-memory store: development and automated tests only ─────────────── */

type Mem = { orders: Map<string, Order>; byRzp: Map<string, string>; payments: Set<string>; events: Map<string, { type: string; at: string }>; tokens: Map<string, { orderId: string; expiresAt: string }> };
const g = globalThis as unknown as { __ztfcMem?: Mem };

class MemoryStore implements OrderStore {
  private m: Mem = (g.__ztfcMem ??= { orders: new Map(), byRzp: new Map(), payments: new Set(), events: new Map(), tokens: new Map() });

  async createOrder(o: NewOrder) {
    const order: Order = {
      ...o, razorpayPaymentId: null, status: "pending", createdAt: now(), paidAt: null,
      emailStatus: "pending", emailAttempts: 0, emailSentAt: null, lastEmailError: null,
      ownerEmailStatus: "pending", ownerEmailAttempts: 0, ownerEmailSentAt: null, lastOwnerEmailError: null,
      downloadCount: 0, downloadsToday: 0, downloadDay: null, lastDownloadAt: null,
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
});

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
}

let instance: OrderStore | null = null;
export function getStore(): OrderStore {
  instance ??= storeDriver() === "supabase" ? new SupabaseStore() : new MemoryStore();
  return instance;
}
