import { z } from "zod";
import { withAuth } from "@/server/auth/with-auth";
import { getDashboard } from "@/server/services/dashboard/admin-dashboard.service";
import { parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";

const DashboardQuerySchema = z.object({
  branch_id: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const query = parseQuery(request, DashboardQuerySchema);
    return ok(await getDashboard(query, session));
  },
);
