import { StudentUpdateSchema } from "@/contracts/students";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import {
  getAdminStudent,
  updateAdminStudent,
} from "@/server/services/students/admin-student.service";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;

export const GET = withAuth(roles, async (_request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID murid tidak valid.", 400);
  }
  return ok(await getAdminStudent(id, session));
});

export const PATCH = withAuth(roles, async (request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID murid tidak valid.", 400);
  }
  const input = await parseBody(request, StudentUpdateSchema);
  return ok(await updateAdminStudent(id, input, session));
});
