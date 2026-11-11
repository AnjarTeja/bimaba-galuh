import { BranchUpdateSchema } from "@/contracts/branches";
import { withAuth } from "@/server/auth/with-auth";
import {
  assertBranchManagementAccess,
  deactivateBranch,
  getBranch,
  updateBranch,
} from "@/server/services/branches/admin-branches.service";
import { AppError } from "@/server/http/errors";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;

export const GET = withAuth(roles, async (_request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID cabang tidak valid.", 400);
  }
  return ok(await getBranch(id, session));
});

export const PATCH = withAuth(
  ["super_admin", "unit_head"],
  async (request, context: RouteContext, session) => {
    assertBranchManagementAccess(session);
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID cabang tidak valid.", 400);
    }
    const input = await parseBody(request, BranchUpdateSchema);
    const updated = await updateBranch(id, input, session);
    return ok({ id: updated.id, updated_at: updated.updatedAt.toISOString() });
  },
);

export const DELETE = withAuth(
  ["super_admin", "unit_head"],
  async (_request, context: RouteContext, session) => {
    assertBranchManagementAccess(session);
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID cabang tidak valid.", 400);
    }
    return ok(await deactivateBranch(id, session));
  },
);
