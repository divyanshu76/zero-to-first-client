import "server-only";
import { BRAND_LOGO } from "./brand-logo";
import type { Order } from "./store";

/**
 * One-page A4 "Payment Receipt" PDF for a verified order. Not a GST tax invoice: no GSTIN,
 * registration or tax is configured, so none is shown.
 *
 * Built without dependencies: standard Helvetica fonts (WinAnsi), the embedded logo as a
 * JPEG XObject (header + a faint centre watermark), and a vector-drawn ₹ sign, since the
 * standard fonts have no rupee glyph. Standard fonts cover Latin-1 only, so the receipt is
 * in English; a name in another script is noted as "as entered at checkout".
 */
export type ReceiptInput = Pick<Order, "id" | "customerName" | "customerEmail" | "customerPhone" | "amount" | "currency" | "razorpayPaymentId" | "paidAt" | "status"> & {
  supportEmail: string | null;
  /** Defaults to now; the receipt's issue time. */
  issuedAt?: string;
};

export const receiptNumber = (o: Pick<Order, "id" | "paidAt">) =>
  `CC-${(o.paidAt ?? new Date().toISOString()).slice(0, 10).replace(/-/g, "")}-${o.id.slice(4, 12).toUpperCase()}`;

export function formatIst(iso: string | null, locale: "en" | "hi" = "en") {
  const d = iso ? new Date(iso) : new Date();
  return `${d.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })} IST`;
}

export const formatAmount = (paise: number, currency: string) => `${currency} ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Text: WinAnsi encoding and Helvetica metrics (AFM widths, 1/1000 em) ── */

const WIN: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99 };
const encodable = (s: string) => [...s].every((c) => WIN[c] !== undefined || (c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) <= 0xff && !(c.charCodeAt(0) >= 0x7f && c.charCodeAt(0) < 0xa0)));
const winAnsi = (s: string) => [...s].map((c) => String.fromCharCode(WIN[c] ?? (c.charCodeAt(0) <= 0xff ? c.charCodeAt(0) : 0x3f))).join("");
const esc = (s: string) => winAnsi(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
function width(s: string, size: number, bold = false) {
  const t = bold ? BOLD : REG;
  return ([...s].reduce((w, c) => w + (t[c.charCodeAt(0) - 32] ?? (c === "—" ? 1000 : 556)), 0) * size) / 1000;
}
function fit(s: string, max: number, size: number, bold = false) {
  if (width(s, size, bold) <= max) return s;
  let out = s;
  while (out.length > 1 && width(`${out}...`, size, bold) > max) out = out.slice(0, -1);
  return `${out}...`;
}

/* ── JPEG logo ─────────────────────────────────────────────────────────── */

function jpegInfo(buf: Buffer) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), components: buf[i + 9] };
    }
    i += 2 + len;
  }
  return null;
}

const logo = (() => {
  if (!BRAND_LOGO || BRAND_LOGO.mime !== "image/jpeg") return null;
  const data = Buffer.from(BRAND_LOGO.base64, "base64");
  const info = jpegInfo(data);
  return info && (info.components === 3 || info.components === 1) ? { data, ...info } : null;
})();

/* ── Palette (matches the site's Tailwind tokens) ─────────────────────── */

const C = {
  ink: "0.067 0.067 0.075", // #111113
  ink2: "0.42 0.408 0.447", // #6b6872
  line: "0.91 0.898 0.929", // #e8e5ed
  paper: "0.98 0.976 0.965", // #faf9f6
  white: "1 1 1",
  violet: "0.427 0.157 0.851", // #6d28d9
  violetSoft: "0.953 0.937 0.996",
  green: "0.024 0.373 0.275",
  greenSoft: "0.863 0.988 0.906",
};

export function buildReceiptPdf(r: ReceiptInput): Buffer {
  const W = 595.28;
  const H = 841.89;
  const M = 48; // page margin
  const ops: string[] = [];
  const rect = (x: number, y: number, w: number, h: number, fill: string) => ops.push(`${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const round = (x: number, y: number, w: number, h: number, rad: number, fill: string | null, stroke: string | null = null) => {
    const k = rad * 0.5523;
    const p = [
      `${x + rad} ${y} m`, `${x + w - rad} ${y} l`, `${x + w - rad + k} ${y} ${x + w} ${y + rad - k} ${x + w} ${y + rad} c`,
      `${x + w} ${y + h - rad} l`, `${x + w} ${y + h - rad + k} ${x + w - rad + k} ${y + h} ${x + w - rad} ${y + h} c`,
      `${x + rad} ${y + h} l`, `${x + rad - k} ${y + h} ${x} ${y + h - rad + k} ${x} ${y + h - rad} c`,
      `${x} ${y + rad} l`, `${x} ${y + rad - k} ${x + rad - k} ${y} ${x + rad} ${y} c h`,
    ].join(" ");
    ops.push(`${fill ? `${fill} rg ` : ""}${stroke ? `${stroke} RG 0.8 w ` : ""}${p} ${fill && stroke ? "B" : fill ? "f" : "S"}`);
  };
  const hline = (x1: number, x2: number, y: number, color = C.line, w = 0.8) => ops.push(`${color} RG ${w} w ${x1} ${y} m ${x2} ${y} l S`);
  const text = (x: number, y: number, size: number, s: string, opts: { bold?: boolean; color?: string; align?: "left" | "right" | "center"; spacing?: number } = {}) => {
    const w = width(s, size, opts.bold) + (opts.spacing ?? 0) * Math.max(0, s.length - 1);
    const tx = opts.align === "right" ? x - w : opts.align === "center" ? x - w / 2 : x;
    ops.push(`BT /${opts.bold ? "F2" : "F1"} ${size} Tf ${opts.spacing ? `${opts.spacing} Tc ` : ""}${opts.color ?? C.ink} rg ${tx.toFixed(2)} ${y.toFixed(2)} Td (${esc(s)}) Tj ${opts.spacing ? "0 Tc " : ""}ET`);
    return w;
  };
  /** The ₹ sign as strokes, sized like a glyph of `size` points, starting at x on baseline y. Returns its advance. */
  const rupee = (x: number, y: number, size: number, color: string) => {
    const s = size;
    const P = (px: number, py: number) => `${(x + px * s).toFixed(2)} ${(y + py * s).toFixed(2)}`;
    ops.push(
      `q ${color} RG ${(s * 0.075).toFixed(2)} w 1 J 1 j`,
      `${P(0.06, 0.7)} m ${P(0.56, 0.7)} l S`,
      `${P(0.06, 0.56)} m ${P(0.56, 0.56)} l S`,
      `${P(0.06, 0.7)} m ${P(0.22, 0.7)} l ${P(0.42, 0.7)} ${P(0.43, 0.41)} ${P(0.2, 0.41)} c ${P(0.06, 0.41)} l S`,
      `${P(0.15, 0.41)} m ${P(0.5, 0.0)} l S Q`,
    );
    return s * 0.62;
  };
  /** "₹599.00", right- or left-aligned. */
  const money = (x: number, y: number, size: number, paise: number, opts: { bold?: boolean; color?: string; align?: "left" | "right" } = {}) => {
    const digits = num(paise);
    const total = size * 0.62 + width(digits, size, opts.bold);
    const left = opts.align === "right" ? x - total : x;
    const adv = rupee(left, y, size, opts.color ?? C.ink);
    text(left + adv, y, size, digits, { bold: opts.bold, color: opts.color });
  };

  const paid = r.status === "paid";
  const number = receiptNumber(r);
  const name = encodable(r.customerName) ? r.customerName : "As entered at checkout (see your order email)";

  // Page background and a soft white sheet
  rect(0, 0, W, H, C.paper);
  rect(0, H - 6, W, 6, C.violet);

  // Watermark: the logo, very faint, centred behind the content
  if (logo) ops.push(`q /GSw gs ${300} 0 0 ${300} ${(W - 300) / 2} ${(H - 300) / 2 - 40} cm /Logo Do Q`);
  else ops.push(`q /GSw gs BT /F2 64 Tf ${C.violet} rg 1 0 0 1 ${(W - width("CRAFT & CODE", 64, true)) / 2} ${H / 2 - 60} Tm (CRAFT & CODE) Tj ET Q`);

  // ── Header ──
  const top = H - 46;
  if (logo) ops.push(`q 62 0 0 62 ${M} ${top - 62} cm /Logo Do Q`);
  const brandX = logo ? M + 76 : M;
  text(brandX, top - 22, 20, "CRAFT & CODE", { bold: true });
  text(brandX, top - 39, 10, "ZERO TO FIRST CLIENT — 2026 Edition", { color: C.ink2 });
  text(brandX, top - 53, 8.5, "craftandcode.tech", { color: C.violet });

  text(W - M, top - 32, 22, "Payment Receipt", { align: "right", bold: true });
  text(W - M, top - 48, 9.5, `Receipt No. ${number}`, { align: "right", color: C.ink2 });
  text(W - M, top - 61, 9.5, `Issued ${formatIst(r.issuedAt ?? new Date().toISOString())}`, { align: "right", color: C.ink2 });

  hline(M, W - M, top - 80);

  // ── Amount summary band ──
  let y = top - 96;
  round(M, y - 74, W - 2 * M, 74, 12, C.violetSoft);
  text(M + 20, y - 24, 9, "AMOUNT PAID", { bold: true, color: C.violet, spacing: 1 });
  money(M + 20, y - 56, 28, r.amount, { bold: true });
  text(M + 20 + 28 * 0.62 + width(num(r.amount), 28, true) + 8, y - 56, 11, r.currency, { color: C.ink2, bold: true });
  // Status pill
  const pill = paid ? "PAID" : r.status.toUpperCase();
  const pw = width(pill, 10, true) + 28;
  round(W - M - 20 - pw, y - 44, pw, 24, 12, paid ? C.greenSoft : "1 0.93 0.86");
  if (paid) ops.push(`q ${C.green} RG 1.6 w 1 J 1 j ${W - M - 20 - pw + 11} ${y - 32} m ${W - M - 20 - pw + 14} ${y - 35.5} l ${W - M - 20 - pw + 19} ${y - 28} l S Q`);
  text(W - M - 20 - pw + (paid ? 23 : 14), y - 35.5, 10, pill, { bold: true, color: paid ? C.green : "0.6 0.25 0" });
  text(W - M - 20, y - 60, 9, `Paid ${formatIst(r.paidAt)}`, { align: "right", color: C.ink2 });

  // ── Billed to / Payment details ──
  y -= 104;
  const colW = (W - 2 * M - 24) / 2;
  const col2 = M + colW + 24;
  text(M, y, 8.5, "BILLED TO", { bold: true, color: C.violet, spacing: 1 });
  text(col2, y, 8.5, "PAYMENT DETAILS", { bold: true, color: C.violet, spacing: 1 });
  hline(M, M + colW, y - 8);
  hline(col2, W - M, y - 8);
  const field = (x: number, yy: number, label: string, value: string, w: number) => {
    text(x, yy, 8.5, label, { color: C.ink2 });
    text(x, yy - 13, 10.5, fit(value, w, 10.5, true), { bold: true });
  };
  field(M, y - 26, "Full name", name, colW);
  field(M, y - 58, "Email", r.customerEmail, colW);
  field(M, y - 90, "Mobile", r.customerPhone ? r.customerPhone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2") : "Not provided", colW);
  field(col2, y - 26, "Order ID", r.id, colW);
  field(col2, y - 58, "Razorpay payment ID", r.razorpayPaymentId ?? "-", colW);
  field(col2, y - 90, "Payment date", formatIst(r.paidAt), colW);

  // ── Item table ──
  y -= 136;
  const xQty = W - M - 200;
  const xUnit = W - M - 100;
  round(M, y - 8, W - 2 * M, 26, 6, C.white, C.line);
  text(M + 14, y + 1, 8.5, "ITEM", { bold: true, color: C.ink2, spacing: 0.8 });
  text(xQty, y + 1, 8.5, "QTY", { bold: true, color: C.ink2, align: "right", spacing: 0.8 });
  text(xUnit, y + 1, 8.5, "UNIT PRICE", { bold: true, color: C.ink2, align: "right", spacing: 0.8 });
  text(W - M - 14, y + 1, 8.5, "AMOUNT", { bold: true, color: C.ink2, align: "right", spacing: 0.8 });
  y -= 34;
  text(M + 14, y, 11, "ZERO TO FIRST CLIENT", { bold: true });
  text(M + 14, y - 14, 9, "The AI-Powered Business Starter Kit", { color: C.ink2 });
  text(M + 14, y - 27, 9, "2026 Edition (Edition 1.0) · Digital download (PDF ebook)", { color: C.ink2 });
  text(xQty, y, 10.5, "1", { align: "right" });
  money(xUnit, y, 10.5, r.amount, { align: "right" });
  money(W - M - 14, y, 10.5, r.amount, { align: "right", bold: true });
  y -= 44;
  hline(M, W - M, y);

  // ── Totals ──
  const xLabel = W - M - 190;
  y -= 22;
  text(xLabel, y, 10, "Subtotal", { color: C.ink2 });
  money(W - M - 14, y, 10.5, r.amount, { align: "right" });
  y -= 14;
  hline(xLabel, W - M, y, C.line);
  y -= 24;
  text(xLabel, y, 12, "Total paid", { bold: true });
  money(W - M - 14, y, 16, r.amount, { align: "right", bold: true, color: C.violet });
  text(W - M - 14, y - 15, 8.5, `Currency: ${r.currency} · Status: ${paid ? "PAID" : r.status.toUpperCase()}`, { align: "right", color: C.ink2 });

  // ── Delivery note ──
  y -= 56;
  round(M, y - 52, W - 2 * M, 60, 10, C.white, C.line);
  text(M + 16, y - 12, 9.5, "Digital delivery", { bold: true });
  text(M + 16, y - 27, 9, "Your ebook is delivered through a private, secure download link sent to the email above.", { color: C.ink2 });
  text(M + 16, y - 40, 9, "The link is tied to this order; each use creates a fresh download that expires after 15 minutes.", { color: C.ink2 });

  // ── Footer ──
  const fy = 104;
  hline(M, W - M, fy + 26);
  text(M, fy + 6, 12, "Thank you for purchasing from CRAFT & CODE.", { bold: true });
  text(M, fy - 12, 9, `Support: ${r.supportEmail ?? "craftandcode.tech/contact"}   ·   Website: https://craftandcode.tech`, { color: C.ink2 });
  text(M, fy - 26, 9, "Sold by CRAFT & CODE · Published by DEADCODE LABS", { color: C.ink2 });
  text(M, fy - 50, 7.5, "This is a computer-generated payment receipt for a digital product. It is not a GST tax invoice.", { color: C.ink2 });
  text(W - M, fy - 50, 7.5, number, { color: C.ink2, align: "right" });

  const content = ops.join("\n");
  const objects: (string | Buffer)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /ExtGState << /GSw 8 0 R >>${logo ? " /XObject << /Logo 9 0 R >>" : ""} >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    `<< /Title (${esc(`Payment Receipt ${number}`)}) /Author (CRAFT & CODE) /Subject (ZERO TO FIRST CLIENT - 2026 Edition) /Producer (craftandcode.tech) >>`,
    "<< /Type /ExtGState /ca 0.05 /CA 0.05 >>",
  ];
  if (logo) {
    objects.push(
      Buffer.concat([
        Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /${logo.components === 1 ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n`, "latin1"),
        logo.data,
        Buffer.from("\nendstream", "latin1"),
      ]),
    );
  }

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let size = parts[0].length;
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(size);
    const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), typeof o === "string" ? Buffer.from(o, "latin1") : o, Buffer.from("\nendobj\n", "latin1")]);
    parts.push(chunk);
    size += chunk.length;
  });
  const xref = size;
  parts.push(
    Buffer.from(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}` +
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
      "latin1",
    ),
  );
  return Buffer.concat(parts);
}
