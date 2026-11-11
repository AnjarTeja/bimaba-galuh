import { z } from "zod";
import { EventInputSchema, EventQuerySchema } from "@/contracts/events";
import { withAuth } from "@/server/auth/with-auth";
import { createEvent, listEvents } from "@/server/services/events/admin-events.service";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseBody, parseQuery } from "@/server/http/parse";
import { created, ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;
const AdminEventQuery = EventQuerySchema.extend({
  publication_status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]).optional(),
});

export const GET = withAuth(roles, async (request, _context, session) => {
  const query = parseQuery(request, AdminEventQuery);
  const page = pagination(query.page, query.page_size);
  const { events, total } = await listEvents(query, page, session);
  return ok(
    events.map(({ eventDate, publicationStatus, createdAt, updatedAt, media, ...event }) => ({
      ...event,
      event_date: eventDate?.toISOString() ?? null,
      publication_status: publicationStatus,
      media_asset_ids: media.map((item) => item.mediaAssetId),
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
    })),
    pageMeta(query.page, query.page_size, total),
  );
});

export const POST = withAuth(roles, async (request, _context, session) => {
  const input = await parseBody(request, EventInputSchema);
  const event = await createEvent(input, session);
  return created({
    id: event.id,
    publication_status: event.publicationStatus,
    created_at: event.createdAt.toISOString(),
  });
});
