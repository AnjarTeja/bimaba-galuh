import { StaffQuerySchema } from "@/contracts/staff";
import { handleRoute } from "@/server/http/handle-route";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { listPublicStaffForSite } from "@/server/services/staff/public-staff.service";

export const GET = handleRoute(async (request) => {
  const query = parseQuery(request, StaffQuerySchema);
  const page = pagination(query.page, query.page_size);
  const result = await listPublicStaffForSite(query, page);
  return ok(
    result.data,
    pageMeta(query.page, query.page_size, result.total),
  );
});
