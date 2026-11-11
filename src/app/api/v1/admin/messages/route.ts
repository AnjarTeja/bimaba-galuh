import { z } from "zod";
import { MessageQuerySchema } from "@/contracts/messages";
import { withAuth } from "@/server/auth/with-auth";
import { listMessages, updateMessage } from "@/server/services/messages/admin-messages.service";
import { pagination, pageMeta } from "@/server/http/pagination";
import { parseBody, parseQuery } from "@/server/http/parse";
import { ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head", "branch_admin"] as const;
const UpdateMessageSchema = z.object({
  id: z.uuid(),
  status: z.enum(["new", "in_progress", "resolved", "archived"]),
});

export const GET = withAuth(roles, async (request, _context, session) => {
  const query = parseQuery(request, MessageQuerySchema);
  const page = pagination(query.page, query.page_size);
  const { messages, total } = await listMessages(query, page, session);
  return ok(
    messages.map(({ createdAt, handledAt, handledBy, ...message }) => ({
      ...message,
      created_at: createdAt.toISOString(),
      handled_at: handledAt?.toISOString() ?? null,
      handled_by: handledBy
        ? { id: handledBy.id, full_name: handledBy.fullName }
        : null,
    })),
    pageMeta(query.page, query.page_size, total),
  );
});

export const PATCH = withAuth(roles, async (request, _context, session) => {
  const input = await parseBody(request, UpdateMessageSchema);
  return ok(await updateMessage(input, session));
});
