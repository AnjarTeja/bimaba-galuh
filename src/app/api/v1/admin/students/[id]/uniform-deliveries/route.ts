import { UniformDeliverySchema } from "@/contracts/students";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { created } from "@/server/http/response";
import { createAdminUniformDelivery } from "@/server/services/students/admin-student.service";

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID murid tidak valid.", 400);
    }
    const input = await parseBody(request, UniformDeliverySchema);
    return created(await createAdminUniformDelivery(id, input, session));
  },
);
