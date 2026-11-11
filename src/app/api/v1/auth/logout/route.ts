import { assertSameOrigin } from "@/server/http/csrf";
import { handleRoute } from "@/server/http/handle-route";
import { ok } from "@/server/http/response";
import {
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";
import { logout } from "@/server/services/auth/auth.service";

export const POST = handleRoute(async (request) => {
  assertSameOrigin(request);
  await logout(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  return clearSessionCookie(ok({ logged_out: true }));
});
