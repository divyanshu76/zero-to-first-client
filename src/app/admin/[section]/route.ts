import { NO_STORE } from "@/lib/commerce/http";
import { ADMIN_SECTIONS, adminGet, adminPost } from "@/lib/commerce/admin-handler";

/** /admin/overview, /admin/customers, /admin/payments, /admin/ebook, /admin/email, /admin/recovery — same auth as /admin/orders. */
// A manual reminder send (up to 25 emails, each after a Razorpay re-check) stops starting new sends
// after 40 s; this gives the request room to finish and report every result.
export const maxDuration = 60;
type Ctx = { params: Promise<{ section: string }> };
const section = async (ctx: Ctx) => {
  const s = (await ctx.params).section;
  return (ADMIN_SECTIONS as readonly string[]).includes(s) ? (s as (typeof ADMIN_SECTIONS)[number]) : null;
};
const notFound = () => new Response("Not found", { status: 404, headers: NO_STORE });

export async function GET(request: Request, ctx: Ctx) {
  const s = await section(ctx);
  return s ? adminGet(request, s) : notFound();
}
export async function POST(request: Request, ctx: Ctx) {
  const s = await section(ctx);
  return s ? adminPost(request, s) : notFound();
}
