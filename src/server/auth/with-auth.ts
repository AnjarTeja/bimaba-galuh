import type { NextRequest } from "next/server";
import { AppError } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute, type RouteContext, type RouteHandler } from "@/server/http/handle-route";
import { requireSession, type AuthenticatedSession } from "./session";

type AuthenticatedHandler = (
  request: NextRequest,
  context: RouteContext,
  session: AuthenticatedSession,
) => Promise<Response>;

export function withAuth(
  allowedRoles: readonly string[],
  handler: AuthenticatedHandler,
): RouteHandler {
  return handleRoute(async (request, context) => {
    assertSameOrigin(request);
    const session = await requireSession(request);
    const hasRole = session.user.branchRoles.some((assignment) =>
      allowedRoles.includes(assignment.role.code),
    );

    if (!hasRole) {
      throw new AppError("FORBIDDEN", "Anda tidak memiliki izin untuk tindakan ini.", 403);
    }

    return handler(request, context, session);
  });
}
