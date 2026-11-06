import { adminHome } from "@/lib/commerce/admin-handler";

/** /admin — asks for the admin credentials, then redirects to /admin/orders. */
export function GET(request: Request) {
  return adminHome(request);
}
