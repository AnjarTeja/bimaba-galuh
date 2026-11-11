import { RegistrationQuerySchema } from "@/contracts/registrations";
import { withAuth } from "@/server/auth/with-auth";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { listRegistrations } from "@/server/services/registrations/admin-registration.service";

const roles = ["super_admin", "unit_head", "branch_admin", "teacher"] as const;

export const GET = withAuth(roles, async (request, _context, session) => {
  const query = parseQuery(request, RegistrationQuerySchema);
  const page = pagination(query.page, query.page_size);
  const result = await listRegistrations(query, page, session);
  return ok(
    result.data,
    pageMeta(query.page, query.page_size, result.total),
  );
});
