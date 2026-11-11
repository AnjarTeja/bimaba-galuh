import { RegistrationUpdateSchema } from "@/contracts/registrations";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import type { RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import {
  archiveRegistration,
  getRegistrationDetail,
  updateRegistration,
} from "@/server/services/registrations/admin-registration.service";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;

export const GET = withAuth(roles, async (_request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID pendaftaran tidak valid.", 400);
  }
  return ok(await getRegistrationDetail(id, session));
});

export const PATCH = withAuth(roles, async (request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID pendaftaran tidak valid.", 400);
  }
  const { reason, ...fields } = await parseBody(request, RegistrationUpdateSchema);
  return ok(await updateRegistration(id, fields, reason, session));
});

export const DELETE = withAuth(
  ["super_admin", "unit_head"],
  async (request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID pendaftaran tidak valid.", 400);
    }
    const { reason } = await parseBody(
      request,
      RegistrationUpdateSchema.pick({ reason: true }),
    );
    return ok(await archiveRegistration(id, reason, session));
  },
);
