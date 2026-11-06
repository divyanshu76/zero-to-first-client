import { adminGet, adminPost } from "@/lib/commerce/admin-handler";

/** /admin/orders — the dashboard (overview by default; ?view= and ?id= select other views). */
export function GET(request: Request) {
  return adminGet(request);
}
export function POST(request: Request) {
  return adminPost(request);
}
