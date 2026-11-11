import { handleRoute } from "@/server/http/handle-route";
import { requireSession } from "@/server/auth/session";
import { ok } from "@/server/http/response";
import { getCurrentUser } from "@/server/services/auth/auth.service";

export const GET = handleRoute(async (request) => {
  const session = await requireSession(request);
  return ok(getCurrentUser(session));
});
