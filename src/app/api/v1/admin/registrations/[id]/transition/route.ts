import { RegistrationTransitionSchema } from "@/contracts/registrations";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import type { RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";
import { transitionRegistration } from "@/server/services/registrations/admin-registration.service";

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID pendaftaran tidak valid.", 400);
    }
    const input = await parseBody(request, RegistrationTransitionSchema);
    return ok(await transitionRegistration(id, input, session));
  },
);
