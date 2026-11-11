import { StaffInputSchema } from "@/contracts/staff";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { archiveStaff, updateStaff } from "@/server/services/staff/admin-staff.service";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;

export const PATCH = withAuth(roles, async (request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID staf tidak valid.", 400);
  }
  const input = await parseBody(request, StaffInputSchema.partial());
  const member = await updateStaff(id, input, session);
  return ok({
    id: member.id,
    publication_status: member.publicationStatus,
    updated_at: member.updatedAt.toISOString(),
  });
});

export const DELETE = withAuth(roles, async (_request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID staf tidak valid.", 400);
  }
  return ok(await archiveStaff(id, session));
});
