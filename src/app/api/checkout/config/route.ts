import { connection } from "next/server";
import { PRODUCT, checkoutStatus, razorpayKeys } from "@/lib/commerce/config";
import { json } from "@/lib/commerce/http";

/**
 * Public checkout configuration, read at request time (so turning checkout on or off
 * needs no rebuild). Only the Key ID is exposed: Razorpay designs it to be public.
 * The key secret and webhook secret never leave the server.
 */
export async function GET() {
  await connection();
  const status = checkoutStatus();
  if (!status.enabled) return json({ enabled: false, mode: status.mode, reason: status.reason });
  return json({
    enabled: true,
    mode: status.mode,
    keyId: razorpayKeys().keyId,
    amount: PRODUCT.amount,
    currency: PRODUCT.currency,
    name: "CRAFT & CODE",
    description: PRODUCT.shortName,
  });
}
