import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NO_STORE } from "@/lib/commerce/http";
import { DOWNLOAD_FILENAME, checkLocalSignature, localEbookFile, localFileExists } from "@/lib/commerce/storage";
import { getStore } from "@/lib/commerce/store";

/**
 * Local storage driver only (development and tests): serves the private file for a valid,
 * unexpired signed URL of a paid order. Disabled on Vercel and whenever COMMERCE_STORAGE
 * isn't "local"; production uses Supabase Storage signed URLs instead.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const check = checkLocalSignature(q.get("o"), q.get("exp"), q.get("n"), q.get("sig"));
  if (!check.ok) {
    const status = check.reason === "expired" ? 410 : check.reason === "disabled" ? 404 : 403;
    return new Response(check.reason === "expired" ? "This download link has expired." : "Not available.", { status, headers: NO_STORE });
  }
  try {
    const order = await getStore().getOrder(check.orderId);
    if (order?.status !== "paid") return new Response("Not available.", { status: 403, headers: NO_STORE });
    if (!(await localFileExists())) return new Response("The file is temporarily unavailable.", { status: 503, headers: NO_STORE });
    const stream = Readable.toWeb(createReadStream(localEbookFile())) as ReadableStream;
    return new Response(stream, {
      headers: {
        ...NO_STORE,
        "cache-control": "private, no-store",
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${DOWNLOAD_FILENAME}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("The file is temporarily unavailable.", { status: 503, headers: NO_STORE });
  }
}
