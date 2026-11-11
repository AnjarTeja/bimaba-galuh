import { BranchInputSchema, BranchQuerySchema } from "@/contracts/branches";
import { withAuth } from "@/server/auth/with-auth";
import {
  assertBranchManagementAccess,
  createBranch,
  listBranches,
} from "@/server/services/branches/admin-branches.service";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseBody, parseQuery } from "@/server/http/parse";
import { created, ok } from "@/server/http/response";

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const query = parseQuery(request, BranchQuerySchema);
    const page = pagination(query.page, query.page_size);
    const { branches, total } = await listBranches(query, page, session);
    return ok(
      branches.map(({ createdAt, updatedAt, ...branch }) => ({
        ...branch,
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      })),
      pageMeta(query.page, query.page_size, total),
    );
  },
);

export const POST = withAuth(
  ["super_admin", "unit_head"],
  async (request, _context, session) => {
    assertBranchManagementAccess(session);
    const input = await parseBody(request, BranchInputSchema);
    const branch = await createBranch(input, session);
    return created(branch);
  },
);
