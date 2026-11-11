import { PublicationReviewSchema } from "@/contracts/events";
import { withAuth } from "@/server/auth/with-auth";
import { AppError } from "@/server/http/errors";
import { reviewEvent } from "@/server/services/events/admin-events.service";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";

export const POST = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, context: RouteContext, session) => {
    const { id } = await context.params;
    if (typeof id !== "string") {
      throw new AppError("VALIDATION_ERROR", "ID kegiatan tidak valid.", 400);
    }
    const input = await parseBody(request, PublicationReviewSchema);
    return ok(await reviewEvent(id, input, session));
  },
);
