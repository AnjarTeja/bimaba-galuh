import { BranchQuerySchema } from "@/contracts/branches";
import { handleRoute } from "@/server/http/handle-route";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { listPublicBranchesForSite } from "@/server/services/branches/public-branches.service";

export const GET = handleRoute(async (request) => {
  const query = parseQuery(request, BranchQuerySchema);
  const page = pagination(query.page, query.page_size);
  const result = await listPublicBranchesForSite(query, page);
  return ok(result.data, pageMeta(query.page, query.page_size, result.total));
});
