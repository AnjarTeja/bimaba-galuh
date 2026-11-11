import { EventQuerySchema } from "@/contracts/events";
import { handleRoute } from "@/server/http/handle-route";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { listPublicEventsForSite } from "@/server/services/events/public-events.service";

export const GET = handleRoute(async (request) => {
  const query = parseQuery(request, EventQuerySchema);
  const page = pagination(query.page, query.page_size);
  const result = await listPublicEventsForSite(query, page);
  return ok(result.data, pageMeta(query.page, query.page_size, result.total));
});
