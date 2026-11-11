import { ActivityLogQuerySchema } from "@/contracts/activity-logs";
import { withAuth } from "@/server/auth/with-auth";
import { listAdminActivityLogs } from "@/server/services/activity-logs/admin-activity-logs.service";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const query = parseQuery(request, ActivityLogQuerySchema);
    const page = pagination(query.page, query.page_size);
    const { logs, total } = await listAdminActivityLogs(query, page, session);
    return ok(logs, pageMeta(query.page, query.page_size, total));
  },
);
