import { EventInputSchema } from "@/contracts/events";
import { withAuth } from "@/server/auth/with-auth";
import {
  archiveEvent,
  updateEvent,
} from "@/server/services/events/admin-events.service";
import { AppError } from "@/server/http/errors";
import { type RouteContext } from "@/server/http/handle-route";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;
const EventUpdateSchema = EventInputSchema.partial();

export const PATCH = withAuth(roles, async (request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID kegiatan tidak valid.", 400);
  }
  const input = await parseBody(request, EventUpdateSchema);
  const updated = await updateEvent(id, input, session);
  return ok({
    id: updated.id,
    publication_status: updated.publicationStatus,
    updated_at: updated.updatedAt.toISOString(),
  });
});

export const DELETE = withAuth(roles, async (_request, context: RouteContext, session) => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    throw new AppError("VALIDATION_ERROR", "ID kegiatan tidak valid.", 400);
  }
  return ok(await archiveEvent(id, session));
});
